import { NextRequest, NextResponse } from "next/server";
import { getAvailabilityForDateForUser } from "@/lib/server/availability";
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
    const result = await getAvailabilityForDateForUser(supabaseAdmin, {
      userId: user.id,
      groupId: groupId || undefined,
      date,
    });

    if (result === null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" },
    });
  } catch (err) {
    console.error("Day availability error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
