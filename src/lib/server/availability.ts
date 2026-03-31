import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clampCalendarMonth } from "@/lib/calendar";
import type { AvailabilityWithUser, TimeSlot } from "@/lib/types";
import { getGroupMemberIds, isGroupMember } from "@/lib/server/groups";

interface AvailabilityRow {
  id: string;
  user_id: string;
  date: string;
  time_slots: string[] | null;
  comment: string;
  user:
    | { display_name: string | null; avatar_url: string | null }
    | { display_name: string | null; avatar_url: string | null }[]
    | null;
}

interface AvailabilityQueryParams {
  userId: string;
  groupId?: string;
}

async function resolveScopedMemberIds(
  supabase: SupabaseClient,
  { userId, groupId }: AvailabilityQueryParams
) {
  if (!groupId) {
    return [userId];
  }

  if (!(await isGroupMember(supabase, groupId, userId))) {
    return null;
  }

  return getGroupMemberIds(supabase, groupId);
}

function getJoinedProfile(row: AvailabilityRow) {
  return Array.isArray(row.user) ? row.user[0] : row.user;
}

function mapAvailabilityRows(rows: AvailabilityRow[]) {
  return rows.map((availability) => {
    const profile = getJoinedProfile(availability);

    return {
      id: availability.id,
      userId: availability.user_id,
      date: availability.date,
      timeSlots: (availability.time_slots ?? []) as TimeSlot[],
      comment: availability.comment,
      user: {
        id: availability.user_id,
        displayName: profile?.display_name || "ユーザー",
        avatarUrl: profile?.avatar_url || null,
      },
    } satisfies AvailabilityWithUser;
  });
}

export function parseCalendarMonthParam(
  monthParam?: string,
  now: Date = new Date()
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

export async function getAvailabilityRangeForUser(
  supabase: SupabaseClient,
  {
    userId,
    groupId,
    start,
    end,
  }: AvailabilityQueryParams & { start: string; end: string }
) {
  const memberIds = await resolveScopedMemberIds(supabase, { userId, groupId });

  if (memberIds === null) {
    return null;
  }

  if (memberIds.length === 0) {
    return { availabilities: [], currentUserId: userId };
  }

  const { data } = await supabase
    .from("availability")
    .select("id, user_id, date, time_slots, comment, user:profiles(display_name, avatar_url)")
    .gte("date", start)
    .lte("date", end)
    .in("user_id", memberIds);

  const rows = (data ?? []) as AvailabilityRow[];

  return {
    availabilities: mapAvailabilityRows(rows),
    currentUserId: userId,
  };
}

export async function getAvailabilityForDateForUser(
  supabase: SupabaseClient,
  {
    userId,
    groupId,
    date,
  }: AvailabilityQueryParams & { date: string }
) {
  const memberIds = await resolveScopedMemberIds(supabase, { userId, groupId });

  if (memberIds === null) {
    return null;
  }

  if (memberIds.length === 0) {
    return { availabilities: [], currentUserId: userId };
  }

  const { data } = await supabase
    .from("availability")
    .select("id, user_id, date, time_slots, comment, user:profiles(display_name, avatar_url)")
    .eq("date", date)
    .in("user_id", memberIds);

  const rows = (data ?? []) as AvailabilityRow[];

  return {
    availabilities: mapAvailabilityRows(rows),
    currentUserId: userId,
  };
}

export async function getOwnAvailabilityEntriesForMonth(
  supabase: SupabaseClient,
  {
    userId,
    month,
  }: {
    userId: string;
    month: Date;
  }
) {
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

  const { data } = await supabase
    .from("availability")
    .select("date, time_slots, comment")
    .eq("user_id", userId)
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
