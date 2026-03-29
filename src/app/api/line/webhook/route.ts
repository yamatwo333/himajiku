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

async function replyMessage(replyToken: string, text: string) {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
  } catch {
    // ignore
  }
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

    // bot参加イベント
    if (event.type === "join") {
      await replyMessage(
        event.replyToken,
        "シェアヒマ通知Botが追加されました！\n\nシェアヒマのグループ設定から「LINE連携コードを発行」して、このグループに「連携 XXXXXX」と送ってください。"
      );
    }

    // bot退出イベント
    if (event.type === "leave") {
      await supabase
        .from("groups")
        .update({ line_group_id: null, link_code: null, link_code_expires_at: null })
        .eq("line_group_id", lineGroupId);
    }

    // メッセージイベント（連携コード処理）
    if (event.type === "message" && event.message?.type === "text") {
      const text = (event.message.text as string).trim();
      const match = text.match(/^連携\s+([A-Za-z0-9]{6})$/);
      if (!match) continue;

      const code = match[1].toUpperCase();

      // コードでグループを検索
      const { data: group } = await supabase
        .from("groups")
        .select("id, name, link_code_expires_at, line_group_id")
        .eq("link_code", code)
        .single();

      if (!group) {
        await replyMessage(event.replyToken, "連携コードが見つかりません。コードを確認してください。");
        continue;
      }

      // 有効期限チェック
      if (group.link_code_expires_at && new Date(group.link_code_expires_at) < new Date()) {
        await replyMessage(event.replyToken, "連携コードの有効期限が切れています。シェアヒマから再発行してください。");
        continue;
      }

      // 既に別のLINEグループと連携済み
      if (group.line_group_id && group.line_group_id !== lineGroupId) {
        await replyMessage(event.replyToken, "このグループは既に別のLINEグループと連携されています。");
        continue;
      }

      // 連携を設定
      await supabase
        .from("groups")
        .update({
          line_group_id: lineGroupId,
          link_code: null,
          link_code_expires_at: null,
        })
        .eq("id", group.id);

      await replyMessage(
        event.replyToken,
        `「${group.name}」とこのLINEグループの連携が完了しました！\n条件を満たすと、このグループに通知が届きます。`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
