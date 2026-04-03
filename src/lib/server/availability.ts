import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildGuestActorId, type RequestActor } from "@/lib/actors";
import { clampCalendarMonth } from "@/lib/calendar";
import { getCurrentMonthStartInTokyo, getReferenceNow } from "@/lib/date";
import type { AvailabilityWithUser, TimeSlot } from "@/lib/types";
import {
  getGroupGuestMemberIds,
  getGroupMemberIds,
  isGroupMember,
  isGuestGroupMember,
} from "@/lib/server/groups";

interface UserAvailabilityRow {
  id: string;
  user_id: string;
  date: string;
  time_slots: string[] | null;
  comment: string | null;
  user:
    | { display_name: string | null; avatar_url: string | null }
    | { display_name: string | null; avatar_url: string | null }[]
    | null;
}

interface GuestAvailabilityRow {
  id: string;
  guest_member_id: string;
  date: string;
  time_slots: string[] | null;
  comment: string | null;
  guest_member:
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
}

async function canViewGroupAvailability(
  supabase: SupabaseClient,
  actor: RequestActor,
  groupId: string
) {
  if (actor.kind === "guest") {
    return isGuestGroupMember(supabase, groupId, actor.guestMemberId);
  }

  return isGroupMember(supabase, groupId, actor.userId);
}

async function getUserAvailabilityRows(
  supabase: SupabaseClient,
  {
    start,
    end,
    userIds,
  }: {
    start: string;
    end: string;
    userIds: string[];
  }
) {
  if (userIds.length === 0) {
    return [] satisfies AvailabilityWithUser[];
  }

  const { data, error } = await supabase
    .from("availability")
    .select("id, user_id, date, time_slots, comment, user:profiles(display_name, avatar_url)")
    .gte("date", start)
    .lte("date", end)
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserAvailabilityRow[]).map((availability) => {
    const profile = Array.isArray(availability.user)
      ? availability.user[0]
      : availability.user;

    return {
      id: availability.id,
      userId: availability.user_id,
      date: availability.date,
      timeSlots: (availability.time_slots ?? []) as TimeSlot[],
      comment: availability.comment ?? "",
      user: {
        id: availability.user_id,
        displayName: profile?.display_name || "ユーザー",
        avatarUrl: profile?.avatar_url || null,
      },
    } satisfies AvailabilityWithUser;
  });
}

async function getGuestAvailabilityRows(
  supabase: SupabaseClient,
  {
    start,
    end,
    guestMemberIds,
  }: {
    start: string;
    end: string;
    guestMemberIds: string[];
  }
) {
  if (guestMemberIds.length === 0) {
    return [] satisfies AvailabilityWithUser[];
  }

  const { data, error } = await supabase
    .from("guest_availability")
    .select("id, guest_member_id, date, time_slots, comment, guest_member:guest_members(display_name)")
    .gte("date", start)
    .lte("date", end)
    .in("guest_member_id", guestMemberIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as GuestAvailabilityRow[]).map((availability) => {
    const guestMember = Array.isArray(availability.guest_member)
      ? availability.guest_member[0]
      : availability.guest_member;
    const actorId = buildGuestActorId(availability.guest_member_id);

    return {
      id: availability.id,
      userId: actorId,
      date: availability.date,
      timeSlots: (availability.time_slots ?? []) as TimeSlot[],
      comment: availability.comment ?? "",
      user: {
        id: actorId,
        displayName: guestMember?.display_name || "ゲスト",
        avatarUrl: null,
      },
    } satisfies AvailabilityWithUser;
  });
}

function sortAvailabilities(availabilities: AvailabilityWithUser[]) {
  return availabilities.sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.user.displayName.localeCompare(right.user.displayName, "ja");
  });
}

async function getGroupedAvailabilityRows(
  supabase: SupabaseClient,
  {
    groupId,
    start,
    end,
  }: {
    groupId: string;
    start: string;
    end: string;
  }
) {
  const [userIds, guestMemberIds] = await Promise.all([
    getGroupMemberIds(supabase, groupId),
    getGroupGuestMemberIds(supabase, groupId),
  ]);

  const [userAvailabilities, guestAvailabilities] = await Promise.all([
    getUserAvailabilityRows(supabase, { start, end, userIds }),
    getGuestAvailabilityRows(supabase, { start, end, guestMemberIds }),
  ]);

  return sortAvailabilities([...userAvailabilities, ...guestAvailabilities]);
}

async function getScopedAvailability(
  supabase: SupabaseClient,
  {
    actor,
    groupId,
    start,
    end,
  }: {
    actor: RequestActor;
    groupId?: string;
    start: string;
    end: string;
  }
) {
  const effectiveGroupId =
    groupId || (actor.kind === "guest" ? actor.groupId : undefined);

  if (effectiveGroupId) {
    if (!(await canViewGroupAvailability(supabase, actor, effectiveGroupId))) {
      return null;
    }

    return getGroupedAvailabilityRows(supabase, {
      groupId: effectiveGroupId,
      start,
      end,
    });
  }

  if (actor.kind === "guest") {
    return getGuestAvailabilityRows(supabase, {
      start,
      end,
      guestMemberIds: [actor.guestMemberId],
    });
  }

  return getUserAvailabilityRows(supabase, {
    start,
    end,
    userIds: [actor.userId],
  });
}

export function parseCalendarMonthParam(
  monthParam?: string,
  now: Date = getReferenceNow()
) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return clampCalendarMonth(now, now);
  }

  return clampCalendarMonth(new Date(`${monthParam}-01T00:00:00`), now);
}

export function getCalendarMonthRange(month: Date) {
  const normalizedMonth = startOfMonth(month);

  return {
    month: normalizedMonth,
    start: format(startOfWeek(normalizedMonth, { weekStartsOn: 0 }), "yyyy-MM-dd"),
    end: format(endOfWeek(endOfMonth(normalizedMonth), { weekStartsOn: 0 }), "yyyy-MM-dd"),
  };
}

export async function cleanupExpiredAvailability(supabase: SupabaseClient) {
  const cutoffDate = getCurrentMonthStartInTokyo();

  const [{ error: userError }, { error: guestError }] = await Promise.all([
    supabase.from("availability").delete().lt("date", cutoffDate),
    supabase.from("guest_availability").delete().lt("date", cutoffDate),
  ]);

  if (userError) {
    console.warn("Expired availability cleanup error:", userError.message);
  }

  if (guestError) {
    console.warn("Expired guest availability cleanup error:", guestError.message);
  }
}

export async function getAvailabilityRangeForActor(
  supabase: SupabaseClient,
  {
    actor,
    groupId,
    start,
    end,
  }: {
    actor: RequestActor;
    groupId?: string;
    start: string;
    end: string;
  }
) {
  const availabilities = await getScopedAvailability(supabase, {
    actor,
    groupId,
    start,
    end,
  });

  if (availabilities === null) {
    return null;
  }

  return {
    availabilities,
    currentUserId: actor.actorId,
  };
}

export async function getAvailabilityForDateForActor(
  supabase: SupabaseClient,
  {
    actor,
    groupId,
    date,
  }: {
    actor: RequestActor;
    groupId?: string;
    date: string;
  }
) {
  const availabilities = await getScopedAvailability(supabase, {
    actor,
    groupId,
    start: date,
    end: date,
  });

  if (availabilities === null) {
    return null;
  }

  return {
    availabilities,
    currentUserId: actor.actorId,
  };
}

export async function getOwnAvailabilityEntriesForActorMonth(
  supabase: SupabaseClient,
  {
    actor,
    month,
  }: {
    actor: RequestActor;
    month: Date;
  }
) {
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

  if (actor.kind === "guest") {
    const { data } = await supabase
      .from("guest_availability")
      .select("date, time_slots, comment")
      .eq("guest_member_id", actor.guestMemberId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    return (data ?? []).reduce<Record<string, { date: string; timeSlots: TimeSlot[]; comment: string }>>(
      (entries, availability) => {
        entries[availability.date] = {
          date: availability.date,
          timeSlots: (availability.time_slots ?? []) as TimeSlot[],
          comment: availability.comment ?? "",
        };

        return entries;
      },
      {}
    );
  }

  const { data } = await supabase
    .from("availability")
    .select("date, time_slots, comment")
    .eq("user_id", actor.userId)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  return (data ?? []).reduce<Record<string, { date: string; timeSlots: TimeSlot[]; comment: string }>>(
    (entries, availability) => {
      entries[availability.date] = {
        date: availability.date,
        timeSlots: (availability.time_slots ?? []) as TimeSlot[],
        comment: availability.comment ?? "",
      };

      return entries;
    },
    {}
  );
}
