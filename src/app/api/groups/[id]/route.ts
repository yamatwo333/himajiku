import { NextRequest, NextResponse } from "next/server";
import { getGroupDetailForUser, getGroupOwnerId } from "@/lib/server/groups";
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
    const result = await getGroupDetailForUser(supabaseAdmin, groupId, user.id);

    if (!result) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    return NextResponse.json(result);
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
