import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  const { date, group_id } = await request.json();

  if (!date || !group_id) {
    return NextResponse.json({ error: "date and group_id are required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get group settings
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", group_id)
    .single();

  if (!group) {
    return NextResponse.json({ sent: false, reason: "group not found" });
  }

  const lineToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  // LINE not configured
  if (!group.line_group_id || !lineToken) {
    // Check for time-slot matches for future notification support
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group_id);

    if (!members) {
      return NextResponse.json({ sent: false, reason: "no members" });
    }

    const memberIds = members.map((m) => m.user_id);

    const { data: avails } = await supabase
      .from("availability")
      .select("user_id, time_slots")
      .eq("date", date)
      .in("user_id", memberIds);

    if (!avails) {
      return NextResponse.json({ sent: false, reason: "no availabilities" });
    }

    // Check each time slot for matching people
    const matches: Record<string, number> = {};
    for (const slot of ALL_SLOTS) {
      const count = avails.filter((a) =>
        (a.time_slots as string[]).includes(slot)
      ).length;
      if (count >= group.notify_threshold) {
        matches[slot] = count;
      }
    }

    return NextResponse.json({
      sent: false,
      reason: "LINE not configured",
      matches,
    });
  }

  // Get group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group_id);

  if (!members) {
    return NextResponse.json({ sent: false, reason: "no members" });
  }

  const memberIds = members.map((m) => m.user_id);

  const { data: avails } = await supabase
    .from("availability")
    .select("*, user:profiles(display_name)")
    .eq("date", date)
    .in("user_id", memberIds);

  if (!avails) {
    return NextResponse.json({ sent: false, reason: "no availabilities" });
  }

  // Check each time slot for matching people (threshold check per slot)
  const matchingSlots: { slot: string; people: typeof avails }[] = [];

  for (const slot of ALL_SLOTS) {
    const matching = avails.filter((a) =>
      (a.time_slots as string[]).includes(slot)
    );
    if (matching.length >= group.notify_threshold) {
      matchingSlots.push({ slot, people: matching });
    }
  }

  if (matchingSlots.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: `no time slot has ${group.notify_threshold}+ people`,
    });
  }

  // Format message
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });

  const slotMessages = matchingSlots.map(({ slot, people }) => {
    const slotLabel = TIME_SLOT_LABELS[slot];
    const names = people.map((p) => {
      const name = (p.user as any)?.display_name || "ユーザー";
      const comment = p.comment ? ` 「${p.comment}」` : "";
      return `  ・${name}${comment}`;
    });
    return [`📌 ${slotLabel}（${people.length}人）`, ...names].join("\n");
  });

  const message = [
    `🎉 [${group.name}] ${dateLabel}`,
    "",
    ...slotMessages,
    "",
    "シェアヒマで詳細を見る 👀",
  ].join("\n");

  // Send via LINE Messaging API
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
      return NextResponse.json({ sent: false, error: "LINE API error" }, { status: 500 });
    }

    return NextResponse.json({ sent: true, matchingSlots: matchingSlots.length });
  } catch (error) {
    console.error("LINE notify error:", error);
    return NextResponse.json({ sent: false, error: "network error" }, { status: 500 });
  }
}
