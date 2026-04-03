import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserGroupIds } from "@/lib/server/groups";
import { getGroupAvailabilityMatchingSlots } from "@/lib/server/notify";
import type { GroupDateNotificationBaseline } from "@/lib/server/jobs/availability-jobs";

export async function captureNotificationBaselines({
  supabase,
  userId,
  dates,
}: {
  supabase: SupabaseClient;
  userId: string;
  dates: string[];
}) {
  const uniqueDates = [...new Set(dates)];

  if (uniqueDates.length === 0) {
    return [] satisfies GroupDateNotificationBaseline[];
  }

  const groupIds = await getUserGroupIds(supabase, userId);

  if (groupIds.length === 0) {
    return [] satisfies GroupDateNotificationBaseline[];
  }

  const baselines = await Promise.all(
    groupIds.map(async (groupId) => {
      const matchingSlotsByDate = await getGroupAvailabilityMatchingSlots({
        supabase,
        groupId,
        dates: uniqueDates,
      });

      return uniqueDates.map((date) => ({
        groupId,
        date,
        matchingSlots: matchingSlotsByDate.get(date) ?? [],
      }));
    })
  );

  return baselines.flat() satisfies GroupDateNotificationBaseline[];
}
