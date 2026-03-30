import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { isDateBeforeTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { sendGroupAvailabilityNotification } from "@/lib/server/notify";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, time_slots, comment } = await request.json();

    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "日付を指定してください" }, { status: 400 });
    }

    if (isDateBeforeTodayInTokyo(date)) {
      return NextResponse.json({ error: "当日より前の日付はシェアできません" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await ensureProfile(supabaseAdmin, user);

    if (!time_slots || time_slots.length === 0) {
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
        time_slots,
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
        const { data: memberships } = await supabaseAdmin
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);

        if (memberships?.length) {
          await Promise.allSettled(
            memberships.map((membership) =>
              sendGroupAvailabilityNotification({
                date,
                groupId: membership.group_id,
              })
            )
          );
        }

        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);

        await supabaseAdmin
          .from("availability")
          .delete()
          .lt("date", cutoffDate.toISOString().split("T")[0]);
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
