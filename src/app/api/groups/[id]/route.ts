import { NextRequest, NextResponse } from "next/server";
import { getGroupOwnerId, isGroupMember } from "@/lib/server/groups";
import { getProfileMap } from "@/lib/server/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(
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

    if (!(await isGroupMember(supabaseAdmin, groupId, user.id))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Get group
    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get members with profiles
    const { data: members } = await supabaseAdmin
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    let memberProfiles: {
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      joined_at: string;
    }[] = [];
    if (members) {
      const profileMap = await getProfileMap(
        supabaseAdmin,
        members.map((member) => member.user_id)
      );

      memberProfiles = members.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          user_id: m.user_id,
          display_name: profile?.display_name || "ユーザー",
          avatar_url: profile?.avatar_url || null,
          joined_at: m.joined_at,
        };
      });
    }

    return NextResponse.json({ group, members: memberProfiles });
  } catch (err) {
    console.error("Group detail error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
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
    if ((await getGroupOwnerId(supabaseAdmin, groupId)) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete members first, then group
    await supabaseAdmin.from("group_members").delete().eq("group_id", groupId);
    await supabaseAdmin.from("groups").delete().eq("id", groupId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Group delete error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
