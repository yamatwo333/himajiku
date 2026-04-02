import { NextRequest, NextResponse } from "next/server";
import { getE2EAvailabilityRangeForUser, isE2EUser } from "@/lib/e2e";
import { getAvailabilityRangeForUser } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("group") || "";
    const start = request.nextUrl.searchParams.get("start") || "";
    const end = request.nextUrl.searchParams.get("end") || "";

    if (!start || !end) {
      return NextResponse.json({ error: "start and end required" }, { status: 400 });
    }

    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isE2EUser(user.id)) {
      const result = getE2EAvailabilityRangeForUser(user.id, groupId || undefined);

      if (result === null) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json(result, {
        headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" },
      });
    }

    const supabaseAdmin = createAdminClient();
    const result = await getAvailabilityRangeForUser(supabaseAdmin, {
      userId: user.id,
      groupId: groupId || undefined,
      start,
      end,
    });

    if (result === null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" },
    });
  } catch (err) {
    console.error("Month availability error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
