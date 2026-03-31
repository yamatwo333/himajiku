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

    const supabaseAdmin = createAdminClient();

    const ownerId = await getGroupOwnerId(supabaseAdmin, groupId);

    if (!ownerId) {
      return NextResponse.json({ error: "グループが見つかりません" }, { status: 404 });
    }

    const isOwner = ownerId === user.id;

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
