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

    const { new_owner_id } = await request.json();
    if (!new_owner_id) {
      return NextResponse.json({ error: "新しい管理者を指定してください" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 現在の管理者か確認
    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();

    if (!group || group.created_by !== user.id) {
      return NextResponse.json({ error: "管理者のみ変更可能です" }, { status: 403 });
    }

    // 新しい管理者がメンバーか確認
    const { data: member } = await supabaseAdmin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", new_owner_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "指定されたユーザーはメンバーではありません" }, { status: 400 });
    }

    await supabaseAdmin
      .from("groups")
      .update({ created_by: new_owner_id })
      .eq("id", groupId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Transfer error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
