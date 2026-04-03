import type { SupabaseClient } from "@supabase/supabase-js";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { getNewlyMatchingTimeSlots } from "@/lib/server/availability-notification";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FREE_TIME_SLOTS,
  TIME_SLOT_LABELS,
  type TimeSlot,
  type FreeTimeSlot,
} from "@/lib/types";

interface NotifyParams {
  date: string;
  groupId: string;
  slots?: TimeSlot[];
  previousMatchingSlots?: TimeSlot[];
}

interface NotifyDigestParams {
  dates: string[];
  groupId: string;
}

interface AvailabilityRow {
  date?: string;
  comment?: string | null;
  time_slots: string[] | null;
  user?: { display_name: string | null }[] | { display_name: string | null } | null;
}

interface GroupNotificationContext {
  group: {
    id: string;
    name: string;
    notify_threshold: number;
    line_group_id: string | null;
  };
  memberIds: string[];
  lineToken: string | undefined;
  supabase: SupabaseClient;
}

interface DateMatch {
  date: string;
  matchingSlots: {
    slot: FreeTimeSlot;
    people: AvailabilityRow[];
  }[];
}

const LINE_MESSAGE_CHAR_LIMIT = 4500;
const LINE_MAX_MESSAGES_PER_PUSH = 5;

async function getGroupNotificationContext(
  groupId: string,
  supabase = createAdminClient()
): Promise<GroupNotificationContext | null> {

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, notify_threshold, line_group_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    return null;
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (!members || members.length === 0) {
    return {
      group,
      memberIds: [],
      lineToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
      supabase,
    };
  }

  return {
    group,
    memberIds: members.map((member) => member.user_id),
    lineToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    supabase,
  };
}

function getUserDisplayName(person: AvailabilityRow) {
  const user = Array.isArray(person.user) ? person.user[0] : person.user;
  return user?.display_name || "ユーザー";
}

function buildDateMatches({
  dates,
  availabilities,
  notifyThreshold,
  slotsByDate,
}: {
  dates: string[];
  availabilities: AvailabilityRow[];
  notifyThreshold: number;
  slotsByDate?: Map<string, string[]>;
}) {
  const availabilitiesByDate = new Map<string, AvailabilityRow[]>();

  for (const availability of availabilities) {
    if (!availability.date) continue;

    const dayAvailabilities = availabilitiesByDate.get(availability.date) ?? [];
    dayAvailabilities.push(availability);
    availabilitiesByDate.set(availability.date, dayAvailabilities);
  }

  const matches: DateMatch[] = [];

  for (const date of dates) {
    const dayAvailabilities = availabilitiesByDate.get(date);
    if (!dayAvailabilities?.length) continue;

    const slotsForDate = slotsByDate?.get(date);
    const targetSlots = slotsForDate?.length
      ? FREE_TIME_SLOTS.filter((slot) => slotsForDate.includes(slot))
      : FREE_TIME_SLOTS;

    const matchingSlots = targetSlots.flatMap((slot) => {
      const people = dayAvailabilities.filter((availability) => availability.time_slots?.includes(slot));
      return people.length >= notifyThreshold ? [{ slot, people }] : [];
    });

    if (matchingSlots.length > 0) {
      matches.push({ date, matchingSlots });
    }
  }

  return matches;
}

function buildLineTextMessages({
  title,
  intro,
  blocks,
  footer,
}: {
  title: string;
  intro?: string;
  blocks: string[];
  footer?: string;
}) {
  const messages: string[] = [];
  let current = [title, intro].filter(Boolean).join("\n\n");

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;

    if (candidate.length <= LINE_MESSAGE_CHAR_LIMIT) {
      current = candidate;
      continue;
    }

    if (current) {
      messages.push(current);
    }

    current = `${title}（続き）\n\n${block}`;
  }

  if (footer) {
    const candidate = current ? `${current}\n\n${footer}` : footer;
    if (candidate.length <= LINE_MESSAGE_CHAR_LIMIT) {
      current = candidate;
    } else {
      if (current) {
        messages.push(current);
      }
      current = `${title}（続き）\n\n${footer}`;
    }
  }

  if (current) {
    messages.push(current);
  }

  return messages.slice(0, LINE_MAX_MESSAGES_PER_PUSH);
}

async function pushLineTextMessages({
  lineToken,
  to,
  texts,
}: {
  lineToken: string;
  to: string;
  texts: string[];
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to,
      messages: texts.map((text) => ({ type: "text", text })),
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("LINE push error:", errorBody);
    return { ok: false };
  }

  return { ok: true };
}

export async function sendGroupAvailabilityNotification({
  date,
  groupId,
  slots,
  previousMatchingSlots = [],
}: NotifyParams) {
  const context = await getGroupNotificationContext(groupId);
  if (!context) {
    return { sent: false, reason: "group not found" };
  }

  const { group, memberIds, lineToken, supabase } = context;
  const targetSlots = slots?.length
    ? FREE_TIME_SLOTS.filter((slot) => slots.includes(slot))
    : FREE_TIME_SLOTS;

  if (targetSlots.length === 0) {
    return { sent: false, reason: "no target slots" };
  }

  if (memberIds.length === 0) {
    return { sent: false, reason: "no members" };
  }

  const { data: avails } = await supabase
    .from("availability")
    .select("date, comment, time_slots, user:profiles(display_name)")
    .eq("date", date)
    .in("user_id", memberIds);

  if (!avails || avails.length === 0) {
    return { sent: false, reason: "no availabilities" };
  }

  const matchingSlots: { slot: FreeTimeSlot; people: AvailabilityRow[] }[] = [];

  for (const slot of targetSlots) {
    const matching = (avails as AvailabilityRow[]).filter((avail) =>
      avail.time_slots?.includes(slot)
    );

    if (matching.length >= group.notify_threshold) {
      matchingSlots.push({ slot, people: matching });
    }
  }

  if (matchingSlots.length === 0) {
    return {
      sent: false,
      reason: `no time slot has ${group.notify_threshold}+ people`,
    };
  }

  const newlyMatchingSlots = getNewlyMatchingTimeSlots({
    previousMatchingSlots,
    currentMatchingSlots: matchingSlots.map(({ slot }) => slot),
  });

  if (newlyMatchingSlots.length === 0) {
    return { sent: false, reason: "no new matching slots" };
  }

  const newlyMatchingSlotSet = new Set(newlyMatchingSlots);
  const filteredMatchingSlots = matchingSlots.filter(({ slot }) =>
    newlyMatchingSlotSet.has(slot)
  );

  if (!group.line_group_id || !lineToken) {
    return {
      sent: false,
      reason: "LINE not configured",
      matches: Object.fromEntries(
        filteredMatchingSlots.map(({ slot, people }) => [slot, people.length])
      ) as Partial<Record<FreeTimeSlot, number>>,
    };
  }

  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });

  const slotMessages = filteredMatchingSlots.map(({ slot, people }) => {
    const slotLabel = TIME_SLOT_LABELS[slot];
    const names = people.map((person) => {
      const name = getUserDisplayName(person);
      const comment = person.comment ? ` 「${person.comment}」` : "";

      return `  ・${name}${comment}`;
    });

    return [`📌 ${slotLabel}（${people.length}人）`, ...names].join("\n");
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sharehima.vercel.app";
  const detailLink = `${appUrl}/calendar/${date}?group=${groupId}`;
  const title = `🎉 [${group.name}] ${dateLabel}`;
  const texts = buildLineTextMessages({
    title,
    blocks: slotMessages,
    footer: `シェアヒマで詳細を見る 👀\n${detailLink}`,
  });

  try {
    const result = await pushLineTextMessages({
      lineToken,
      to: group.line_group_id,
      texts,
    });

    if (!result.ok) {
      return { sent: false, error: "LINE API error" };
    }

    return { sent: true, matchingSlots: filteredMatchingSlots.length };
  } catch (error) {
    console.error("LINE notify error:", error);
    return { sent: false, error: "network error" };
  }
}

export async function getGroupAvailabilityMatchingSlots({
  dates,
  groupId,
  supabase = createAdminClient(),
}: {
  dates: string[];
  groupId: string;
  supabase?: SupabaseClient;
}) {
  const uniqueDates = [...new Set(dates)];

  if (uniqueDates.length === 0) {
    return new Map<string, FreeTimeSlot[]>();
  }

  const context = await getGroupNotificationContext(groupId, supabase);
  if (!context || context.memberIds.length === 0) {
    return new Map<string, FreeTimeSlot[]>();
  }

  const { group, memberIds } = context;
  const { data: avails } = await supabase
    .from("availability")
    .select("date, time_slots")
    .in("date", uniqueDates)
    .in("user_id", memberIds);

  if (!avails || avails.length === 0) {
    return new Map<string, FreeTimeSlot[]>();
  }

  const matches = buildDateMatches({
    dates: uniqueDates,
    availabilities: avails as AvailabilityRow[],
    notifyThreshold: group.notify_threshold,
  });

  return new Map(
    matches.map((match) => [
      match.date,
      match.matchingSlots.map(({ slot }) => slot),
    ])
  );
}

export async function sendGroupAvailabilityDigestNotification({
  dates,
  groupId,
}: NotifyDigestParams) {
  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) {
    return { sent: false, reason: "no dates" };
  }

  const context = await getGroupNotificationContext(groupId);
  if (!context) {
    return { sent: false, reason: "group not found" };
  }

  const { group, memberIds, lineToken, supabase } = context;

  if (memberIds.length === 0) {
    return { sent: false, reason: "no members" };
  }

  const { data: avails } = await supabase
    .from("availability")
    .select("date, comment, time_slots, user:profiles(display_name)")
    .in("date", uniqueDates)
    .in("user_id", memberIds);

  if (!avails || avails.length === 0) {
    return { sent: false, reason: "no availabilities" };
  }

  const matches = buildDateMatches({
    dates: uniqueDates,
    availabilities: avails as AvailabilityRow[],
    notifyThreshold: group.notify_threshold,
  });

  if (matches.length === 0) {
    return { sent: false, reason: "no matching dates" };
  }

  if (!group.line_group_id || !lineToken) {
    return { sent: false, reason: "LINE not configured", matchedDates: matches.length };
  }

  const blocks = matches.map((match) => {
    const parsedDate = parse(match.date, "yyyy-MM-dd", new Date());
    const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });
    const slotSummary = match.matchingSlots
      .map(({ slot, people }) => `${TIME_SLOT_LABELS[slot]} ${people.length}人`)
      .join(" / ");

    const peopleSummary = match.matchingSlots
      .flatMap(({ people }) => people.map((person) => getUserDisplayName(person)))
      .filter((name, index, names) => names.indexOf(name) === index)
      .slice(0, 4)
      .join("、");

    return [
      `・${dateLabel} ${slotSummary}`,
      peopleSummary ? `  ${peopleSummary}` : null,
    ].filter(Boolean).join("\n");
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sharehima.vercel.app";
  const texts = buildLineTextMessages({
    title: `🎉 [${group.name}] 参加後に条件を満たしていた日があります`,
    blocks,
    footer: `カレンダーを見る 👀\n${appUrl}/calendar?group=${groupId}`,
  });

  try {
    const result = await pushLineTextMessages({
      lineToken,
      to: group.line_group_id,
      texts,
    });

    if (!result.ok) {
      return { sent: false, error: "LINE API error" };
    }

    return { sent: true, matchedDates: matches.length };
  } catch (error) {
    console.error("LINE digest notify error:", error);
    return { sent: false, error: "network error" };
  }
}
