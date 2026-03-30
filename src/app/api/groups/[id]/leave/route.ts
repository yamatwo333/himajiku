import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // グループ情報を取得
    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "グループが見つかりません" }, { status: 404 });
    }

    const isOwner = group.created_by === user.id;

    if (isOwner) {
      // 管理者の場合：他のメンバーがいれば引き継ぎ、いなければグループ削除
      const { data: otherMembers } = await supabaseAdmin
        .from("group_members")
        .select("user_id, joined_at")
        .eq("group_id", groupId)
        .neq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1);

      if (otherMembers && otherMembers.length > 0) {
        // 最も古いメンバーに管理者を引き継ぎ
        await supabaseAdmin
          .from("groups")
          .update({ created_by: otherMembers[0].user_id })
          .eq("id", groupId);
      } else {
        // 他にメンバーがいない場合はグループ削除
        await supabaseAdmin.from("group_members").delete().eq("group_id", groupId);
        await supabaseAdmin.from("groups").delete().eq("id", groupId);
        return NextResponse.json({ success: true, action: "deleted" });
      }
    }

    // グループ内での自分のavailabilityは残す（グローバルデータのため）
    // メンバーシップを削除
    await supabaseAdmin
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, action: "left" });
  } catch (err) {
    console.error("Leave error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
