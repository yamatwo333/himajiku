import { NextRequest, NextResponse } from "next/server";
import { getGroupMemberIds, isGroupMember } from "@/lib/server/groups";
import { getProfileMap } from "@/lib/server/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const groupId = request.nextUrl.searchParams.get("group") || "";

    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    let memberIds: string[] = [user.id];

    if (groupId) {
      if (!(await isGroupMember(supabaseAdmin, groupId, user.id))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      memberIds = await getGroupMemberIds(supabaseAdmin, groupId);

      if (memberIds.length === 0) {
        return NextResponse.json({ availabilities: [], currentUserId: user.id });
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
    const profileMap = await getProfileMap(
      supabaseAdmin,
      avails.map((availability) => availability.user_id)
    );

    const result = avails.map((a) => {
      const profile = profileMap.get(a.user_id);
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
