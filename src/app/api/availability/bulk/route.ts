import { after, NextRequest, NextResponse } from "next/server";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { getUserGroupIds } from "@/lib/server/groups";
import { sendGroupAvailabilityNotification } from "@/lib/server/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";
import { normalizeTimeSlots } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dates, time_slots, comment } = await request.json();
    const normalizedTimeSlots = normalizeTimeSlots(time_slots);
    const rawDates = Array.isArray(dates) ? dates : [];
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

    const supabaseAdmin = createAdminClient();

    await ensureProfile(supabaseAdmin, user);

    const records = uniqueDates.map((date) => ({
      user_id: user.id,
      date,
      time_slots: normalizedTimeSlots,
      comment: comment || "",
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
        const groupIds = await getUserGroupIds(supabaseAdmin, user.id);

        if (groupIds.length > 0) {
          await Promise.allSettled(
            uniqueDates.flatMap((date) =>
              groupIds.map((groupId) =>
                sendGroupAvailabilityNotification({
                  date,
                  groupId,
                })
              )
            )
          );
        }
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
