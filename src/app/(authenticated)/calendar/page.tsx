import { redirect } from "next/navigation";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import {
  getE2EAvailabilityRangeForUser,
  getE2EGroupSummaries,
  isE2EUser,
} from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import {
  getAvailabilityRangeForUser,
  getCalendarMonthRange,
  parseCalendarMonthParam,
} from "@/lib/server/availability";
import { getGroupSummariesForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string }>;
}) {
  const [{ group: requestedGroupId, month: requestedMonth }, userId] = await Promise.all([
    searchParams,
    getRequestUserId(),
  ]);

  if (!userId) {
    redirect("/login?redirect=%2Fcalendar");
  }

  if (isE2EUser(userId)) {
    const groups = getE2EGroupSummaries(userId);
    const selectedGroupId =
      requestedGroupId && groups.some((group) => group.id === requestedGroupId)
        ? requestedGroupId
        : groups[0]?.id ?? "";
    const initialMonth = parseCalendarMonthParam(requestedMonth);
    const monthRange = getCalendarMonthRange(initialMonth);
    const availabilityResult = getE2EAvailabilityRangeForUser(
      userId,
      selectedGroupId || undefined
    );

    return (
      <CalendarPageClient
        initialAvailabilities={availabilityResult?.availabilities ?? []}
        initialCurrentUserId={availabilityResult?.currentUserId ?? userId}
        initialGroups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          notify_threshold: group.notify_threshold,
        }))}
        initialSelectedGroupId={selectedGroupId}
        initialMonthIso={monthRange.month.toISOString()}
      />
    );
  }

  const supabaseAdmin = createAdminClient();
  const groups = await getGroupSummariesForUser(supabaseAdmin, userId);
  const selectedGroupId =
    requestedGroupId && groups.some((group) => group.id === requestedGroupId)
      ? requestedGroupId
      : groups[0]?.id ?? "";
  const initialMonth = parseCalendarMonthParam(requestedMonth);
  const monthRange = getCalendarMonthRange(initialMonth);
  const availabilityResult = await getAvailabilityRangeForUser(supabaseAdmin, {
    userId,
    groupId: selectedGroupId || undefined,
    start: monthRange.start,
    end: monthRange.end,
  });

  return (
    <CalendarPageClient
      initialAvailabilities={availabilityResult?.availabilities ?? []}
      initialCurrentUserId={availabilityResult?.currentUserId ?? userId}
      initialGroups={groups.map((group) => ({
        id: group.id,
        name: group.name,
        notify_threshold: group.notify_threshold,
      }))}
      initialSelectedGroupId={selectedGroupId}
      initialMonthIso={monthRange.month.toISOString()}
    />
  );
}
