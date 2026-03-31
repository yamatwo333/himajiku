import { after, NextRequest, NextResponse } from "next/server";
import { getTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { sendGroupAvailabilityDigestNotification } from "@/lib/server/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const invite_code = body?.invite_code;
    if (!invite_code || !invite_code.trim()) {
      return NextResponse.json({ error: "招待コードを入力してください" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Ensure profile exists
    await ensureProfile(supabaseAdmin, user);

    // Find group by invite code
    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("id, name, notify_threshold, line_group_id")
      .eq("invite_code", invite_code.trim().toUpperCase())
      .single();

    if (!group) {
      return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
    }

    // Check if already member
    const { data: existing } = await supabaseAdmin
      .from("group_members")
      .select("*")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "すでにこのグループに参加しています", group },
        { status: 409 }
      );
    }

    const today = getTodayInTokyo();
    const { data: myFutureAvailabilities } = await supabaseAdmin
      .from("availability")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", today);

    const futureDates = [...new Set((myFutureAvailabilities ?? []).map((availability) => availability.date))];

    // Join
    const { error: joinError } = await supabaseAdmin
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
      });

    if (joinError) {
      console.error("Join error:", joinError);
      return NextResponse.json({ error: "参加に失敗しました" }, { status: 500 });
    }

    if (group.line_group_id && futureDates.length > 0) {
      after(async () => {
        await sendGroupAvailabilityDigestNotification({
          dates: futureDates,
          groupId: group.id,
        });
      });
    }

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Join unexpected error:", err);
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}
