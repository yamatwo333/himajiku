import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clampCalendarMonth } from "@/lib/calendar";
import type { AvailabilityWithUser, TimeSlot } from "@/lib/types";
import { getGroupMemberIds, isGroupMember } from "@/lib/server/groups";

interface AvailabilityRpcRow {
  id: string;
  user_id: string;
  date: string;
  time_slots: string[] | null;
  comment: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface FallbackAvailabilityRow {
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

interface AvailabilityRpcPayload {
  allowed: boolean;
  availabilities: AvailabilityRpcRow[];
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

function isAvailabilityRpcRow(value: unknown): value is AvailabilityRpcRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.user_id === "string" &&
    typeof row.date === "string" &&
    (row.comment === null || typeof row.comment === "string") &&
    (row.display_name === null || typeof row.display_name === "string") &&
    (row.avatar_url === null || typeof row.avatar_url === "string") &&
    (row.time_slots === null ||
      (Array.isArray(row.time_slots) &&
        row.time_slots.every((timeSlot) => typeof timeSlot === "string")))
  );
}

async function getScopedAvailabilityPayload(
  supabase: SupabaseClient,
  {
    userId,
    groupId,
    start,
    end,
  }: AvailabilityQueryParams & { start: string; end: string }
) {
  const { data, error } = await supabase.rpc("get_scoped_availability_range", {
    viewer_user_id: userId,
    target_group_id: groupId ?? null,
    start_date: start,
    end_date: end,
  });

  if (error) {
    console.warn("Falling back to legacy availability query:", error.message);

    const memberIds = await resolveScopedMemberIds(supabase, { userId, groupId });

    if (memberIds === null) {
      return { allowed: false, availabilities: [] } satisfies AvailabilityRpcPayload;
    }

    if (memberIds.length === 0) {
      return { allowed: true, availabilities: [] } satisfies AvailabilityRpcPayload;
    }

    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("availability")
      .select("id, user_id, date, time_slots, comment, user:profiles(display_name, avatar_url)")
      .gte("date", start)
      .lte("date", end)
      .in("user_id", memberIds);

    if (fallbackError) {
      throw fallbackError;
    }

    const availabilities = ((fallbackRows ?? []) as FallbackAvailabilityRow[]).map((row) => {
      const profile = Array.isArray(row.user) ? row.user[0] : row.user;

      return {
        id: row.id,
        user_id: row.user_id,
        date: row.date,
        time_slots: row.time_slots,
        comment: row.comment,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      } satisfies AvailabilityRpcRow;
    });

    return {
      allowed: true,
      availabilities,
    } satisfies AvailabilityRpcPayload;
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return null;
  }

  const allowed = payload.allowed === true;
  const availabilities = Array.isArray(payload.availabilities)
    ? payload.availabilities.filter(isAvailabilityRpcRow)
    : [];

  return { allowed, availabilities } satisfies AvailabilityRpcPayload;
}

function mapAvailabilityRows(rows: AvailabilityRpcRow[]) {
  return rows.map((availability) => {
    return {
      id: availability.id,
      userId: availability.user_id,
      date: availability.date,
      timeSlots: (availability.time_slots ?? []) as TimeSlot[],
      comment: availability.comment ?? "",
      user: {
        id: availability.user_id,
        displayName: availability.display_name || "ユーザー",
        avatarUrl: availability.avatar_url || null,
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
  const payload = await getScopedAvailabilityPayload(supabase, {
    userId,
    groupId,
    start,
    end,
  });

  if (!payload?.allowed) {
    return null;
  }

  return {
    availabilities: mapAvailabilityRows(payload.availabilities),
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
  const payload = await getScopedAvailabilityPayload(supabase, {
    userId,
    groupId,
    start: date,
    end: date,
  });

  if (!payload?.allowed) {
    return null;
  }

  return {
    availabilities: mapAvailabilityRows(payload.availabilities),
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
