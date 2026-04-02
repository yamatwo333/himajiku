import { NextRequest, NextResponse } from "next/server";
import { getE2EGroupDetail, isE2EUser } from "@/lib/e2e";
import { getGroupOwnerId } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isE2EUser(user.id)) {
      const result = getE2EGroupDetail(user.id, groupId);

      if (!result) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (result.group.created_by !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json({ success: true });
    }

    const supabaseAdmin = createAdminClient();

    if ((await getGroupOwnerId(supabaseAdmin, groupId)) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    await supabaseAdmin
      .from("groups")
      .update({
        name: body.name?.trim() || undefined,
        notify_threshold: body.notify_threshold,
      })
      .eq("id", groupId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
