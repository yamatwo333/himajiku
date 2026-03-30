import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "午前",
  afternoon: "午後",
  evening: "夜",
  late_night: "夜中",
};

const ALL_SLOTS = ["morning", "afternoon", "evening", "late_night"];

interface NotifyParams {
  date: string;
  groupId: string;
  slots?: string[];
}

interface NotifyDigestParams {
  dates: string[];
  groupId: string;
}

interface AvailabilityRow {
  date?: string;
  comment: string | null;
  time_slots: string[] | null;
  user: { display_name: string | null }[] | { display_name: string | null } | null;
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
    slot: string;
    people: AvailabilityRow[];
  }[];
}

async function getGroupNotificationContext(groupId: string): Promise<GroupNotificationContext | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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
  const matches: DateMatch[] = [];

  for (const date of dates) {
    const dayAvailabilities = availabilities.filter((availability) => availability.date === date);
    if (dayAvailabilities.length === 0) continue;

    const targetSlots = slotsByDate?.get(date)?.length
      ? ALL_SLOTS.filter((slot) => slotsByDate.get(date)?.includes(slot))
      : ALL_SLOTS;

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

export async function sendGroupAvailabilityNotification({
  date,
  groupId,
  slots,
}: NotifyParams) {
  const context = await getGroupNotificationContext(groupId);
  if (!context) {
    return { sent: false, reason: "group not found" };
  }

  const { group, memberIds, lineToken, supabase } = context;
  const targetSlots = slots?.length
    ? ALL_SLOTS.filter((slot) => slots.includes(slot))
    : ALL_SLOTS;

  if (targetSlots.length === 0) {
    return { sent: false, reason: "no target slots" };
  }

  if (memberIds.length === 0) {
    return { sent: false, reason: "no members" };
  }

  if (!group.line_group_id || !lineToken) {
    const { data: avails } = await supabase
      .from("availability")
      .select("user_id, time_slots")
      .eq("date", date)
      .in("user_id", memberIds);

    if (!avails || avails.length === 0) {
      return { sent: false, reason: "no availabilities" };
    }

    const matches: Record<string, number> = {};

    for (const slot of targetSlots) {
      const count = avails.filter((avail) =>
        (avail.time_slots as string[] | null)?.includes(slot)
      ).length;

      if (count >= group.notify_threshold) {
        matches[slot] = count;
      }
    }

    return {
      sent: false,
      reason: "LINE not configured",
      matches,
    };
  }

  const { data: avails } = await supabase
    .from("availability")
    .select("date, comment, time_slots, user:profiles(display_name)")
    .eq("date", date)
    .in("user_id", memberIds);

  if (!avails || avails.length === 0) {
    return { sent: false, reason: "no availabilities" };
  }

  const matchingSlots: { slot: string; people: AvailabilityRow[] }[] = [];

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

  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });

  const slotMessages = matchingSlots.map(({ slot, people }) => {
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
  const message = [
    `🎉 [${group.name}] ${dateLabel}`,
    "",
    ...slotMessages,
    "",
    `シェアヒマで詳細を見る 👀\n${detailLink}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: group.line_group_id,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("LINE push error:", errorBody);
      return { sent: false, error: "LINE API error" };
    }

    return { sent: true, matchingSlots: matchingSlots.length };
  } catch (error) {
    console.error("LINE notify error:", error);
    return { sent: false, error: "network error" };
  }
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

  const visibleMatches = matches.slice(0, 5);
  const lines = visibleMatches.flatMap((match) => {
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
    ].filter(Boolean);
  });

  if (matches.length > visibleMatches.length) {
    lines.push(`・ほか ${matches.length - visibleMatches.length} 日`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sharehima.vercel.app";
  const message = [
    `🎉 [${group.name}] 参加後に条件を満たしていた日があります`,
    "",
    ...lines,
    "",
    `カレンダーを見る 👀\n${appUrl}/calendar?group=${groupId}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: group.line_group_id,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("LINE digest push error:", errorBody);
      return { sent: false, error: "LINE API error" };
    }

    return { sent: true, matchedDates: matches.length };
  } catch (error) {
    console.error("LINE digest notify error:", error);
    return { sent: false, error: "network error" };
  }
}
