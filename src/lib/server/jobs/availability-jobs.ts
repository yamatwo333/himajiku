import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentMonthStartInTokyo } from "@/lib/date";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserGroupIds } from "@/lib/server/groups";
import {
  sendGroupAvailabilityDigestNotification,
  sendGroupAvailabilityNotification,
} from "@/lib/server/notify";
import type { TimeSlot } from "@/lib/types";

interface GroupJoinNotificationTarget {
  id: string;
  line_group_id: string | null;
}

export interface AvailabilityEffectsQueue {
  enqueueGroupDateNotifications: (jobs: GroupDateNotificationJob[]) => Promise<void>;
  enqueueGroupDigestNotification: (job: { groupId: string; dates: string[] }) => Promise<void>;
}

export interface GroupDateNotificationBaseline {
  groupId: string;
  date: string;
  matchingSlots: TimeSlot[];
}

export interface GroupDateNotificationJob {
  groupId: string;
  date: string;
  previousMatchingSlots: TimeSlot[];
}

function createInProcessAvailabilityEffectsQueue(): AvailabilityEffectsQueue {
  return {
    async enqueueGroupDateNotifications(jobs) {
      if (jobs.length === 0) {
        return;
      }

      await Promise.allSettled(
        jobs.map(({ groupId, date, previousMatchingSlots }) =>
          sendGroupAvailabilityNotification({
            groupId,
            date,
            previousMatchingSlots,
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
  notificationBaselines = [],
}: {
  supabase?: SupabaseClient;
  userId: string;
  dates: string[];
  cleanupOldAvailability?: boolean;
  queue?: AvailabilityEffectsQueue;
  notificationBaselines?: GroupDateNotificationBaseline[];
}) {
  const uniqueDates = [...new Set(dates)];

  if (uniqueDates.length > 0) {
    const groupIds = await getUserGroupIds(supabase, userId);

    if (groupIds.length > 0) {
      await queue.enqueueGroupDateNotifications(
        buildGroupDateNotificationJobs({
          groupIds,
          dates: uniqueDates,
          notificationBaselines,
        })
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

export function buildGroupDateNotificationJobs({
  groupIds,
  dates,
  notificationBaselines,
}: {
  groupIds: string[];
  dates: string[];
  notificationBaselines: GroupDateNotificationBaseline[];
}) {
  const baselineLookup = new Map(
    notificationBaselines.map((baseline) => [
      `${baseline.groupId}:${baseline.date}`,
      baseline.matchingSlots,
    ])
  );

  return dates.flatMap((date) =>
    groupIds.map((groupId) => ({
      groupId,
      date,
      previousMatchingSlots: baselineLookup.get(`${groupId}:${date}`) ?? [],
    }))
  );
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
