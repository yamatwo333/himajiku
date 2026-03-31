import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGroupOwnerId } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

// POST: 連携コード発行
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

    if ((await getGroupOwnerId(supabaseAdmin, groupId)) !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate 6-character alphanumeric code
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分有効

    await supabaseAdmin
      .from("groups")
      .update({ link_code: code, link_code_expires_at: expiresAt.toISOString() })
      .eq("id", groupId);

    return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("Link code generation error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: LINE連携解除
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

    await supabaseAdmin
      .from("groups")
      .update({ line_group_id: null, link_code: null, link_code_expires_at: null })
      .eq("id", groupId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unlink error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
