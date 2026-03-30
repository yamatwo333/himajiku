import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { ensureProfile } from "@/lib/ensure-profile";

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

    const { dates, time_slots, comment } = await request.json();

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "日付を選択してください" }, { status: 400 });
    }

    if (!time_slots || !Array.isArray(time_slots) || time_slots.length === 0) {
      return NextResponse.json({ error: "時間帯を選択してください" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await ensureProfile(supabaseAdmin, user);

    const records = dates.map((date: string) => ({
      user_id: user.id,
      date,
      time_slots,
      comment: comment || "",
    }));

    const { error } = await supabaseAdmin
      .from("availability")
      .upsert(records, { onConflict: "user_id,date" });

    if (error) {
      console.error("Bulk upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    // 通知トリガー（全グループ）
    const { data: memberships } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const origin = request.nextUrl.origin;
      Promise.allSettled(
        dates.flatMap((date: string) =>
          memberships.map((m: { group_id: string }) =>
            fetch(`${origin}/api/notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date, group_id: m.group_id }),
            })
          )
        )
      );
    }

    return NextResponse.json({ success: true, count: dates.length });
  } catch (err) {
    console.error("Bulk availability error:", err);
    return NextResponse.json({ error: "予期しないエラー" }, { status: 500 });
  }
}
