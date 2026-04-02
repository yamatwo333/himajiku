import { after, NextRequest, NextResponse } from "next/server";
import { isE2EUser } from "@/lib/e2e";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { runAvailabilityPostSaveJob } from "@/lib/server/jobs/availability-jobs";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";
import type { TimeSlot } from "@/lib/types";
import { normalizeTimeSlots } from "@/lib/types";

interface BulkSyncEntryInput {
  date: string;
  time_slots: TimeSlot[];
  comment: string;
}

function hasSameTimeSlots(left: readonly TimeSlot[], right: readonly TimeSlot[]) {
  return left.length === right.length && left.every((slot, index) => slot === right[index]);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: `availability-bulk:${getRateLimitKeyParts({ request, userId: user.id }).userId}`,
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "操作が多すぎます。少し待ってからお試しください" }, { status: 429 });
    }

    const body = await request.json();

    if (isE2EUser(user.id)) {
      if (Array.isArray(body?.entries)) {
        return NextResponse.json({ success: true, count: body.entries.length });
      }

      const rawDates = Array.isArray(body?.dates) ? body.dates : [];
      return NextResponse.json({ success: true, count: rawDates.length });
    }

    const supabaseAdmin = createAdminClient();

    if (Array.isArray(body?.entries)) {
      const { start, end } = body;

      if (
        typeof start !== "string" ||
        typeof end !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
        start > end
      ) {
        return NextResponse.json({ error: "保存範囲が不正です" }, { status: 400 });
      }

      if (isDateBeforeTodayInTokyo(end)) {
        return NextResponse.json({ error: "当日より前の日付はシェアできません" }, { status: 400 });
      }

      const entriesByDate = new Map<string, BulkSyncEntryInput>();

      for (const rawEntry of body.entries) {
        if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
          return NextResponse.json({ error: "保存データが不正です" }, { status: 400 });
        }

        const date = typeof rawEntry.date === "string" ? rawEntry.date : "";
        const comment = typeof rawEntry.comment === "string" ? rawEntry.comment : "";
        const timeSlots = normalizeTimeSlots(rawEntry.time_slots);

        if (!date || date < start || date > end || isDateBeforeTodayInTokyo(date)) {
          return NextResponse.json({ error: "保存データが不正です" }, { status: 400 });
        }

        if (timeSlots.length === 0) {
          return NextResponse.json({ error: "時間帯を選択してください" }, { status: 400 });
        }

        if (entriesByDate.has(date)) {
          return NextResponse.json({ error: "日付が重複しています" }, { status: 400 });
        }

        entriesByDate.set(date, {
          date,
          time_slots: timeSlots,
          comment,
        });
      }

      const { data: existingRows, error: existingError } = await supabaseAdmin
        .from("availability")
        .select("date, time_slots, comment")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);

      if (existingError) {
        console.error("Bulk sync read error:", existingError);
        return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
      }

      const existingByDate = new Map(
        (existingRows ?? []).map((row) => [
          row.date,
          {
            time_slots: normalizeTimeSlots(row.time_slots),
            comment: row.comment ?? "",
          },
        ])
      );
      const staleDates = [...existingByDate.keys()].filter((date) => !entriesByDate.has(date));
      const changedDates = [...entriesByDate.values()]
        .filter((entry) => {
          const existing = existingByDate.get(entry.date);

          if (!existing) {
            return true;
          }

          return (
            existing.comment !== entry.comment ||
            !hasSameTimeSlots(existing.time_slots, entry.time_slots)
          );
        })
        .map((entry) => entry.date);

      if (staleDates.length > 0 || entriesByDate.size > 0) {
        await ensureProfile(supabaseAdmin, user);
      }

      if (staleDates.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("availability")
          .delete()
          .eq("user_id", user.id)
          .in("date", staleDates);

        if (deleteError) {
          console.error("Bulk delete error:", deleteError);
          return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
        }
      }

      if (entriesByDate.size > 0) {
        const records = [...entriesByDate.values()].map((entry) => ({
          user_id: user.id,
          date: entry.date,
          time_slots: entry.time_slots,
          comment: entry.comment,
        }));

        const { error } = await supabaseAdmin
          .from("availability")
          .upsert(records, { onConflict: "user_id,date" });

        if (error) {
          console.error("Bulk upsert error:", error);
          return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
        }
      }

      const affectedDates = [...new Set([...staleDates, ...changedDates])];

      if (affectedDates.length > 0) {
        after(async () => {
          try {
            await runAvailabilityPostSaveJob({
              supabase: supabaseAdmin,
              userId: user.id,
              dates: affectedDates,
              cleanupOldAvailability: true,
            });
          } catch (error) {
            console.error("Bulk availability post-save tasks error:", error);
          }
        });
      }

      return NextResponse.json({
        success: true,
        count: entriesByDate.size,
        deleted: staleDates.length,
      });
    }

    const normalizedTimeSlots = normalizeTimeSlots(body?.time_slots);
    const rawDates: unknown[] = Array.isArray(body?.dates) ? body.dates : [];
    const uniqueDates: string[] = [
      ...new Set(
        rawDates.filter((date): date is string => typeof date === "string")
      ),
    ];

    if (uniqueDates.length === 0) {
      return NextResponse.json({ error: "日付を選択してください" }, { status: 400 });
    }

    if (normalizedTimeSlots.length === 0) {
      return NextResponse.json({ error: "時間帯を選択してください" }, { status: 400 });
    }

    if (uniqueDates.some((date) => isDateBeforeTodayInTokyo(date))) {
      return NextResponse.json({ error: "当日より前の日付はシェアできません" }, { status: 400 });
    }

    await ensureProfile(supabaseAdmin, user);

    const records = uniqueDates.map((date) => ({
      user_id: user.id,
      date,
      time_slots: normalizedTimeSlots,
      comment: body?.comment || "",
    }));

    const { error } = await supabaseAdmin
      .from("availability")
      .upsert(records, { onConflict: "user_id,date" });

    if (error) {
      console.error("Bulk upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    after(async () => {
      try {
        await runAvailabilityPostSaveJob({
          supabase: supabaseAdmin,
          userId: user.id,
          dates: uniqueDates,
        });
      } catch (error) {
        console.error("Bulk availability post-save tasks error:", error);
      }
    });

    return NextResponse.json({ success: true, count: uniqueDates.length });
  } catch (err) {
    console.error("Bulk availability error:", err);
    return NextResponse.json({ error: "予期しないエラー" }, { status: 500 });
  }
}
