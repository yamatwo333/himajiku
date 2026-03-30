import { NextRequest, NextResponse } from "next/server";
import { sendGroupAvailabilityNotification } from "@/lib/server/notify";

export async function POST(request: NextRequest) {
  const { date, group_id, slots } = await request.json();

  if (!date || !group_id) {
    return NextResponse.json({ error: "date and group_id are required" }, { status: 400 });
  }

  const result = await sendGroupAvailabilityNotification({
    date,
    groupId: group_id,
    slots: Array.isArray(slots) ? slots : undefined,
  });

  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
