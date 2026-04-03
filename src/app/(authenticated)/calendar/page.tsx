import { redirect } from "next/navigation";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import {
  getE2EAvailabilityRangeForUser,
  getE2EGroupSummaries,
  isE2EUser,
} from "@/lib/e2e";
import { getRequestActor } from "@/lib/request-actor";
import {
  cleanupExpiredAvailability,
  getAvailabilityRangeForActor,
  getCalendarMonthRange,
  parseCalendarMonthParam,
} from "@/lib/server/availability";
import { getGroupSummariesForUser, getGroupSummaryForGuest } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string }>;
}) {
  const [{ group: requestedGroupId, month: requestedMonth }, actor] = await Promise.all([
    searchParams,
    getRequestActor(),
  ]);

  if (!actor) {
    redirect("/login?redirect=%2Fcalendar");
  }

  if (actor.kind === "user" && isE2EUser(actor.userId)) {
    const groups = getE2EGroupSummaries(actor.userId);
    const selectedGroupId =
      requestedGroupId && groups.some((group) => group.id === requestedGroupId)
        ? requestedGroupId
        : groups[0]?.id ?? "";
    const initialMonth = parseCalendarMonthParam(requestedMonth);
    const monthRange = getCalendarMonthRange(initialMonth);
    const availabilityResult = getE2EAvailabilityRangeForUser(
      actor.userId,
      selectedGroupId || undefined
    );

    return (
      <CalendarPageClient
        initialAvailabilities={availabilityResult?.availabilities ?? []}
        initialCurrentUserId={availabilityResult?.currentUserId ?? actor.userId}
        initialGroups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          notify_threshold: group.notify_threshold,
        }))}
        initialSelectedGroupId={selectedGroupId}
        initialMonthIso={monthRange.month.toISOString()}
        isGuest={false}
      />
    );
  }

  const supabaseAdmin = createAdminClient();
  await cleanupExpiredAvailability(supabaseAdmin);
  const groups =
    actor.kind === "guest"
      ? [await getGroupSummaryForGuest(supabaseAdmin, actor.guestMemberId)].filter(
          (group): group is NonNullable<typeof group> => group !== null
        )
      : await getGroupSummariesForUser(supabaseAdmin, actor.userId);
  const selectedGroupId =
    requestedGroupId && groups.some((group) => group.id === requestedGroupId)
      ? requestedGroupId
      : groups[0]?.id ?? "";
  const initialMonth = parseCalendarMonthParam(requestedMonth);
  const monthRange = getCalendarMonthRange(initialMonth);
  const availabilityResult = await getAvailabilityRangeForActor(supabaseAdmin, {
    actor,
    groupId: selectedGroupId || undefined,
    start: monthRange.start,
    end: monthRange.end,
  });

  return (
    <CalendarPageClient
      initialAvailabilities={availabilityResult?.availabilities ?? []}
      initialCurrentUserId={availabilityResult?.currentUserId ?? actor.actorId}
      initialGroups={groups.map((group) => ({
        id: group.id,
        name: group.name,
        notify_threshold: group.notify_threshold,
      }))}
      initialSelectedGroupId={selectedGroupId}
      initialMonthIso={monthRange.month.toISOString()}
      isGuest={actor.kind === "guest"}
    />
  );
}
