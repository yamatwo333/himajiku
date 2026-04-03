import { after, NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { runAvailabilityPostSaveJob } from "@/lib/server/jobs/availability-jobs";
import { captureNotificationBaselines } from "@/lib/server/availability-notification-baselines";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteActor } from "@/lib/supabase/route";
import { normalizeTimeSlots } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const actor = await getRouteActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: `availability:${getRateLimitKeyParts({ request, userId: actor.actorId }).userId}`,
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "操作が多すぎます。少し待ってからお試しください" }, { status: 429 });
    }

    const { date, time_slots, comment } = await request.json();
    const normalizedTimeSlots = normalizeTimeSlots(time_slots);

    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "日付を指定してください" }, { status: 400 });
    }

    if (isDateBeforeTodayInTokyo(date)) {
      return NextResponse.json({ error: "当日より前の日付はシェアできません" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const notificationBaselines =
      normalizedTimeSlots.length > 0
        ? await captureNotificationBaselines({
            supabase: supabaseAdmin,
            actor,
            dates: [date],
          })
        : [];

    if (normalizedTimeSlots.length === 0) {
      const deleteQuery =
        actor.kind === "guest"
          ? supabaseAdmin
              .from("guest_availability")
              .delete()
              .eq("guest_member_id", actor.guestMemberId)
              .eq("date", date)
          : supabaseAdmin
              .from("availability")
              .delete()
              .eq("user_id", actor.userId)
              .eq("date", date);

      await deleteQuery;

      return NextResponse.json({ success: true, action: "deleted" });
    }

    if (actor.kind === "user") {
      await ensureProfile(supabaseAdmin, {
        id: actor.userId,
        email: "",
        user_metadata: {},
      } as User);
    }

    const { error } =
      actor.kind === "guest"
        ? await supabaseAdmin.from("guest_availability").upsert(
            {
              guest_member_id: actor.guestMemberId,
              date,
              time_slots: normalizedTimeSlots,
              comment: comment || "",
            },
            { onConflict: "guest_member_id,date" }
          )
        : await supabaseAdmin.from("availability").upsert(
            {
              user_id: actor.userId,
              date,
              time_slots: normalizedTimeSlots,
              comment: comment || "",
            },
            { onConflict: "user_id,date" }
          );

    if (error) {
      console.error("Availability upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    after(async () => {
      try {
        await runAvailabilityPostSaveJob({
          supabase: supabaseAdmin,
          actor,
          dates: [date],
          cleanupOldAvailability: true,
          notificationBaselines,
        });
      } catch (error) {
        console.error("Availability post-save tasks error:", error);
      }
    });

    return NextResponse.json({ success: true, action: "saved" });
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json({ error: "予期しないエラー" }, { status: 500 });
  }
}
