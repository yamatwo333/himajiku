import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
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

    // Get all groups the user belongs to
    const { data: memberships } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupIds = memberships.map((m) => m.group_id);

    const { data: groups } = await supabaseAdmin
      .from("groups")
      .select("*")
      .in("id", groupIds);

    if (!groups) {
      return NextResponse.json({ groups: [] });
    }

    // Get member counts
    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const { count } = await supabaseAdmin
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        return { ...g, member_count: count ?? 0 };
      })
    );

    return NextResponse.json({ groups: groupsWithCount });
  } catch (err) {
    console.error("Fetch groups error:", err);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
