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

    const { date, time_slots, comment } = await request.json();

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

    // 保存成功後、ユーザーが所属する全グループの通知を自動チェック（非同期）
    triggerNotifications(supabaseAdmin, user.id, date, request.nextUrl.origin);

    return NextResponse.json({ success: true, action: "saved" });
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json({ error: "予期しないエラー" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerNotifications(
  supabase: any,
  userId: string,
  date: string,
  origin: string
) {
  try {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) return;

    await Promise.allSettled(
      memberships.map((m: { group_id: string }) =>
        fetch(`${origin}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, group_id: m.group_id }),
        })
      )
    );
  } catch {
    // 通知失敗は無視
  }
}
