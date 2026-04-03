import { after, NextRequest, NextResponse } from "next/server";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { runAvailabilityPostSaveJob } from "@/lib/server/jobs/availability-jobs";
import { captureNotificationBaselines } from "@/lib/server/availability-notification-baselines";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";
import { normalizeTimeSlots } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      key: `availability:${getRateLimitKeyParts({ request, userId: user.id }).userId}`,
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
            userId: user.id,
            dates: [date],
          })
        : [];

    await ensureProfile(supabaseAdmin, user);

    if (normalizedTimeSlots.length === 0) {
      // Delete availability
      await supabaseAdmin
        .from("availability")
        .delete()
        .eq("user_id", user.id)
        .eq("date", date);

      return NextResponse.json({ success: true, action: "deleted" });
    }

    // Upsert availability
    const { error } = await supabaseAdmin.from("availability").upsert(
      {
        user_id: user.id,
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
          userId: user.id,
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
