import { NextRequest, NextResponse } from "next/server";
import { getGroupOwnerId } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { new_owner_id } = await request.json();
    if (!new_owner_id) {
      return NextResponse.json({ error: "新しい管理者を指定してください" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if ((await getGroupOwnerId(supabaseAdmin, groupId)) !== user.id) {
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
