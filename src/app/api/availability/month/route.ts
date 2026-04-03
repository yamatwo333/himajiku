import { NextRequest, NextResponse } from "next/server";
import { getE2EAvailabilityRangeForUser, isE2EUser } from "@/lib/e2e";
import {
  cleanupExpiredAvailability,
  getAvailabilityRangeForActor,
} from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteActor } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("group") || "";
    const start = request.nextUrl.searchParams.get("start") || "";
    const end = request.nextUrl.searchParams.get("end") || "";

    if (!start || !end) {
      return NextResponse.json({ error: "start and end required" }, { status: 400 });
    }

    const actor = await getRouteActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (actor.kind === "user" && isE2EUser(actor.userId)) {
      const result = getE2EAvailabilityRangeForUser(actor.userId, groupId || undefined);

      if (result === null) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json(result, {
        headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=15" },
      });
    }

    const supabaseAdmin = createAdminClient();
    await cleanupExpiredAvailability(supabaseAdmin);
    const result = await getAvailabilityRangeForActor(supabaseAdmin, {
      actor,
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
