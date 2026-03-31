import { NextRequest, NextResponse } from "next/server";
import { getGroupSummariesForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const groups = await getGroupSummariesForUser(supabaseAdmin, user.id);

    return NextResponse.json({ groups }, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("Fetch groups error:", err);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
