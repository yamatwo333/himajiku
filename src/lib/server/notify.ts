import { createClient } from "@supabase/supabase-js";
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

interface AvailabilityRow {
  comment: string | null;
  time_slots: string[] | null;
  user: { display_name: string | null }[] | { display_name: string | null } | null;
}

export async function sendGroupAvailabilityNotification({
  date,
  groupId,
  slots,
}: NotifyParams) {
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
    return { sent: false, reason: "group not found" };
  }

  const targetSlots = slots?.length
    ? ALL_SLOTS.filter((slot) => slots.includes(slot))
    : ALL_SLOTS;

  if (targetSlots.length === 0) {
    return { sent: false, reason: "no target slots" };
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (!members || members.length === 0) {
    return { sent: false, reason: "no members" };
  }

  const memberIds = members.map((member) => member.user_id);
  const lineToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

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
    .select("comment, time_slots, user:profiles(display_name)")
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
      const user = Array.isArray(person.user) ? person.user[0] : person.user;
      const name = user?.display_name || "ユーザー";
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
