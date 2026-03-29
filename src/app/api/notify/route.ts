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

  if (!group || !group.line_group_id || !group.line_channel_access_token) {
    return NextResponse.json({ sent: false, reason: "LINE not configured for this group" });
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

  // Get availabilities for this date from group members
  const { data: avails } = await supabase
    .from("availability")
    .select("*, user:profiles(*)")
    .eq("date", date)
    .in("user_id", memberIds);

  if (!avails || avails.length < group.notify_threshold) {
    return NextResponse.json({
      sent: false,
      reason: `less than ${group.notify_threshold} people (${avails?.length ?? 0} free)`,
    });
  }

  // Format message
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });

  const lines = avails.map((a) => {
    const slots = (a.time_slots as string[])
      .map((s) => TIME_SLOT_LABELS[s] || s)
      .join("・");
    const comment = a.comment ? ` 「${a.comment}」` : "";
    return `・${a.user.display_name}（${slots}）${comment}`;
  });

  const message = [
    `🎉 [${group.name}] ${dateLabel} に${avails.length}人がヒマです！`,
    "",
    ...lines,
    "",
    "himajikuで詳細を見る 👀",
  ].join("\n");

  // Send via LINE Messaging API
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${group.line_channel_access_token}`,
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

    return NextResponse.json({ sent: true, count: avails.length });
  } catch (error) {
    console.error("LINE notify error:", error);
    return NextResponse.json({ sent: false, error: "network error" }, { status: 500 });
  }
}
