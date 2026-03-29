import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function GET(
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

    // Check user is a member
    const { data: membership } = await supabaseAdmin
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
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
      .eq("group_id", groupId);

    let memberProfiles: any[] = [];
    if (members) {
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      memberProfiles = members.map((m) => {
        const profile = profiles?.find((p) => p.id === m.user_id);
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

    // Verify ownership
    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();

    if (!group || group.created_by !== user.id) {
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
