import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("group") || "";
    const start = request.nextUrl.searchParams.get("start") || "";
    const end = request.nextUrl.searchParams.get("end") || "";

    if (!start || !end) {
      return NextResponse.json({ error: "start and end required" }, { status: 400 });
    }

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

    // Get group members
    let memberIds: string[] | null = null;
    if (groupId) {
      const { data: members } = await supabaseAdmin
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (!members || members.length === 0) {
        return NextResponse.json({ availabilities: [], currentUserId: user.id });
      }
      memberIds = members.map((m) => m.user_id);
    }

    let query = supabaseAdmin
      .from("availability")
      .select("*")
      .gte("date", start)
      .lte("date", end);

    if (memberIds) {
      query = query.in("user_id", memberIds);
    }

    const { data: avails } = await query;

    if (!avails) {
      return NextResponse.json({ availabilities: [], currentUserId: user.id });
    }

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
    console.error("Month availability error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
