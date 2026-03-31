import { NextRequest, NextResponse } from "next/server";
import { countMembersByGroupIds, getUserGroupIds } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const groupIds = await getUserGroupIds(supabaseAdmin, user.id);

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const { data: groups } = await supabaseAdmin
      .from("groups")
      .select("*")
      .in("id", groupIds);

    if (!groups) {
      return NextResponse.json({ groups: [] });
    }

    const memberCounts = await countMembersByGroupIds(supabaseAdmin, groupIds);
    const groupsWithCount = groups.map((group) => ({
      ...group,
      member_count: memberCounts.get(group.id) ?? 0,
    }));

    return NextResponse.json({ groups: groupsWithCount }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Fetch groups error:", err);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
