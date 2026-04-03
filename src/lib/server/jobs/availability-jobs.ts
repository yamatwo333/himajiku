import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentMonthStartInTokyo } from "@/lib/date";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserGroupIds } from "@/lib/server/groups";
import {
  sendGroupAvailabilityDigestNotification,
  sendGroupAvailabilityNotification,
} from "@/lib/server/notify";

interface GroupJoinNotificationTarget {
  id: string;
  line_group_id: string | null;
}

export interface AvailabilityEffectsQueue {
  enqueueGroupDateNotifications: (jobs: { groupId: string; date: string }[]) => Promise<void>;
  enqueueGroupDigestNotification: (job: { groupId: string; dates: string[] }) => Promise<void>;
}

function createInProcessAvailabilityEffectsQueue(): AvailabilityEffectsQueue {
  return {
    async enqueueGroupDateNotifications(jobs) {
      if (jobs.length === 0) {
        return;
      }

      await Promise.allSettled(
        jobs.map(({ groupId, date }) =>
          sendGroupAvailabilityNotification({
            groupId,
            date,
          })
        )
      );
    },
    async enqueueGroupDigestNotification({ groupId, dates }) {
      if (dates.length === 0) {
        return;
      }

      await sendGroupAvailabilityDigestNotification({
        groupId,
        dates,
      });
    },
  };
}

export async function runAvailabilityPostSaveJob({
  supabase = createAdminClient(),
  userId,
  dates,
  cleanupOldAvailability = false,
  queue = createInProcessAvailabilityEffectsQueue(),
}: {
  supabase?: SupabaseClient;
  userId: string;
  dates: string[];
  cleanupOldAvailability?: boolean;
  queue?: AvailabilityEffectsQueue;
}) {
  const uniqueDates = [...new Set(dates)];

  if (uniqueDates.length > 0) {
    const groupIds = await getUserGroupIds(supabase, userId);

    if (groupIds.length > 0) {
      await queue.enqueueGroupDateNotifications(
        uniqueDates.flatMap((date) =>
          groupIds.map((groupId) => ({
            groupId,
            date,
          }))
        )
      );
    }
  }

  if (!cleanupOldAvailability) {
    return;
  }

  await supabase
    .from("availability")
    .delete()
    .lt("date", getCurrentMonthStartInTokyo());
}

export async function runGroupJoinPostSaveJob({
  group,
  futureDates,
  queue = createInProcessAvailabilityEffectsQueue(),
}: {
  group: GroupJoinNotificationTarget;
  futureDates: string[];
  queue?: AvailabilityEffectsQueue;
}) {
  const uniqueDates = [...new Set(futureDates)];

  if (!group.line_group_id || uniqueDates.length === 0) {
    return;
  }

  await queue.enqueueGroupDigestNotification({
    groupId: group.id,
    dates: uniqueDates,
  });
}
