import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "午前",
  afternoon: "午後",
  evening: "夜",
  late_night: "夜中",
};

export async function POST(request: NextRequest) {
  const { date } = await request.json();

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_NOTIFY_GROUP_ID;

  if (!accessToken || !groupId) {
    return NextResponse.json(
      { error: "LINE notification not configured" },
      { status: 200 }
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );

  // Get all availabilities for this date with profiles
  const { data: avails } = await supabase
    .from("availability")
    .select("*, user:profiles(*)")
    .eq("date", date);

  if (!avails || avails.length < 3) {
    return NextResponse.json({ sent: false, reason: "less than 3 people" });
  }

  // Format the date nicely
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const dateLabel = format(parsedDate, "M/d (E)", { locale: ja });

  // Build message
  const lines = avails.map((a) => {
    const slots = (a.time_slots as string[])
      .map((s) => TIME_SLOT_LABELS[s] || s)
      .join("・");
    const comment = a.comment ? ` 「${a.comment}」` : "";
    return `・${a.user.display_name}（${slots}）${comment}`;
  });

  const message = [
    `🎉 ${dateLabel} に${avails.length}人がヒマです！`,
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
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("LINE push error:", errorBody);
      return NextResponse.json(
        { sent: false, error: "LINE API error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sent: true, count: avails.length });
  } catch (error) {
    console.error("LINE notify error:", error);
    return NextResponse.json(
      { sent: false, error: "network error" },
      { status: 500 }
    );
  }
}
