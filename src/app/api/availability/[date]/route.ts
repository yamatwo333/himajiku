import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const groupId = request.nextUrl.searchParams.get("group") || "";

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

    let memberIds: string[] = [user.id];

    if (groupId) {
      const { data: membership } = await supabaseAdmin
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: members } = await supabaseAdmin
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (members?.length) {
        memberIds = members.map((member) => member.user_id);
      }
    }

    const { data: avails } = await supabaseAdmin
      .from("availability")
      .select("*")
      .eq("date", date)
      .in("user_id", memberIds);

    if (!avails) {
      return NextResponse.json({ availabilities: [], currentUserId: user.id });
    }

    // Get profiles for these users
    const userIds = [...new Set(avails.map((a) => a.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const result = avails.map((a) => {
      const profile = profiles?.find((p) => p.id === a.user_id);
      return {
        id: a.id,
        userId: a.user_id,
        date: a.date,
        timeSlots: a.time_slots,
        comment: a.comment,
        user: {
          id: a.user_id,
          displayName: profile?.display_name || "ユーザー",
          avatarUrl: profile?.avatar_url || null,
        },
      };
    });

    return NextResponse.json({ availabilities: result, currentUserId: user.id }, {
      headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" },
    });
  } catch (err) {
    console.error("Day availability error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
