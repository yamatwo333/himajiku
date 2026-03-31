import { redirect } from "next/navigation";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import { getAvailabilityRangeForUser, getCalendarMonthRange } from "@/lib/server/availability";
import { getGroupSummariesForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const [{ group: requestedGroupId }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fcalendar");
  }

  const supabaseAdmin = createAdminClient();
  const groups = await getGroupSummariesForUser(supabaseAdmin, user.id);
  const selectedGroupId =
    requestedGroupId && groups.some((group) => group.id === requestedGroupId)
      ? requestedGroupId
      : groups[0]?.id ?? "";
  const initialMonth = new Date();
  const monthRange = getCalendarMonthRange(initialMonth);
  const availabilityResult = await getAvailabilityRangeForUser(supabaseAdmin, {
    userId: user.id,
    groupId: selectedGroupId || undefined,
    start: monthRange.start,
    end: monthRange.end,
  });

  return (
    <CalendarPageClient
      initialAvailabilities={availabilityResult?.availabilities ?? []}
      initialCurrentUserId={availabilityResult?.currentUserId ?? user.id}
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
