import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!channelSecret) return false;

  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

async function getGroupName(groupId: string): Promise<string> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return "LINEグループ";

  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.groupName || "LINEグループ";
    }
  } catch {
    // ignore
  }
  return "LINEグループ";
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature") || "";

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const parsed = JSON.parse(body);
  const events = parsed.events || [];

  for (const event of events) {
    const source = event.source;
    if (source?.type !== "group") continue;
    const lineGroupId = source.groupId;

    if (event.type === "join") {
      const groupName = await getGroupName(lineGroupId);

      await supabase.from("line_bot_groups").upsert(
        { line_group_id: lineGroupId, group_name: groupName },
        { onConflict: "line_group_id" }
      );

      // グループに挨拶メッセージを送信
      const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
      if (token) {
        try {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "text",
                  text: "シェアヒマ通知Botが追加されました！\nシェアヒマのグループ設定からこのLINEグループを連携してください。",
                },
              ],
            }),
          });
        } catch {
          // ignore
        }
      }
    }

    if (event.type === "leave") {
      await supabase
        .from("line_bot_groups")
        .delete()
        .eq("line_group_id", lineGroupId);

      // このLINEグループを使っていたアプリグループのリンクを解除
      await supabase
        .from("groups")
        .update({ line_group_id: null })
        .eq("line_group_id", lineGroupId);
    }
  }

  return NextResponse.json({ ok: true });
}
