import { after, NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isE2EUser } from "@/lib/e2e";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  runAvailabilityPostSaveJob,
} from "@/lib/server/jobs/availability-jobs";
import { captureNotificationBaselines } from "@/lib/server/availability-notification-baselines";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteActor } from "@/lib/supabase/route";
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
    const actor = await getRouteActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: `availability-bulk:${getRateLimitKeyParts({ request, userId: actor.actorId }).userId}`,
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "操作が多すぎます。少し待ってからお試しください" }, { status: 429 });
    }

    const body = await request.json();

    if (actor.kind === "user" && isE2EUser(actor.userId)) {
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
        .from(actor.kind === "guest" ? "guest_availability" : "availability")
        .select("date, time_slots, comment")
        .eq(actor.kind === "guest" ? "guest_member_id" : "user_id", actor.kind === "guest" ? actor.guestMemberId : actor.userId)
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
      const affectedDates = [...new Set([...staleDates, ...changedDates])];
      const notificationBaselines =
        affectedDates.length > 0
          ? await captureNotificationBaselines({
              supabase: supabaseAdmin,
              actor,
              dates: affectedDates,
            })
          : [];

      if (actor.kind === "user" && (staleDates.length > 0 || entriesByDate.size > 0)) {
        await ensureProfile(supabaseAdmin, {
          id: actor.userId,
          user_metadata: {},
        } as User);
      }

      if (staleDates.length > 0) {
        const { error: deleteError } =
          actor.kind === "guest"
            ? await supabaseAdmin
                .from("guest_availability")
                .delete()
                .eq("guest_member_id", actor.guestMemberId)
                .in("date", staleDates)
            : await supabaseAdmin
                .from("availability")
                .delete()
                .eq("user_id", actor.userId)
                .in("date", staleDates);

        if (deleteError) {
          console.error("Bulk delete error:", deleteError);
          return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
        }
      }

      if (entriesByDate.size > 0) {
        const records = [...entriesByDate.values()].map((entry) =>
          actor.kind === "guest"
            ? {
                guest_member_id: actor.guestMemberId,
                date: entry.date,
                time_slots: entry.time_slots,
                comment: entry.comment,
              }
            : {
                user_id: actor.userId,
                date: entry.date,
                time_slots: entry.time_slots,
                comment: entry.comment,
              }
        );

        const { error } =
          actor.kind === "guest"
            ? await supabaseAdmin
                .from("guest_availability")
                .upsert(records, { onConflict: "guest_member_id,date" })
            : await supabaseAdmin
                .from("availability")
                .upsert(records, { onConflict: "user_id,date" });

        if (error) {
          console.error("Bulk upsert error:", error);
          return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
        }
      }

      if (affectedDates.length > 0) {
        after(async () => {
          try {
            await runAvailabilityPostSaveJob({
              supabase: supabaseAdmin,
              actor,
              dates: affectedDates,
              cleanupOldAvailability: true,
              notificationBaselines,
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

    if (actor.kind === "user") {
      await ensureProfile(supabaseAdmin, {
        id: actor.userId,
        user_metadata: {},
      } as User);
    }

    const notificationBaselines = await captureNotificationBaselines({
      supabase: supabaseAdmin,
      actor,
      dates: uniqueDates,
    });

    const records = uniqueDates.map((date) =>
      actor.kind === "guest"
        ? {
            guest_member_id: actor.guestMemberId,
            date,
            time_slots: normalizedTimeSlots,
            comment: body?.comment || "",
          }
        : {
            user_id: actor.userId,
            date,
            time_slots: normalizedTimeSlots,
            comment: body?.comment || "",
          }
    );

    const { error } =
      actor.kind === "guest"
        ? await supabaseAdmin
            .from("guest_availability")
            .upsert(records, { onConflict: "guest_member_id,date" })
        : await supabaseAdmin
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
          actor,
          dates: uniqueDates,
          notificationBaselines,
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
