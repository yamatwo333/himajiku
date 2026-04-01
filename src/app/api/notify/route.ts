import { NextRequest, NextResponse } from "next/server";
import { isGroupMember } from "@/lib/server/groups";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { sendGroupAvailabilityNotification } from "@/lib/server/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const user = await getRouteUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `notify:${getRateLimitKeyParts({ request, userId: user.id }).userId}`,
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "操作が多すぎます。少し待ってからお試しください" }, { status: 429 });
  }

  const { date, group_id, slots } = await request.json();

  if (!date || !group_id) {
    return NextResponse.json({ error: "date and group_id are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const isMember = await isGroupMember(supabase, group_id, user.id);

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sendGroupAvailabilityNotification({
    date,
    groupId: group_id,
    slots: Array.isArray(slots) ? slots : undefined,
  });

  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
