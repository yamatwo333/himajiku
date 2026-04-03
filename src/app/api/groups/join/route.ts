import { after, NextRequest, NextResponse } from "next/server";
import { getTodayInTokyo } from "@/lib/date";
import { ensureProfile } from "@/lib/ensure-profile";
import { createGuestMember, getGuestActorFromRequest, setGuestCookie } from "@/lib/server/guest";
import { runGroupJoinPostSaveJob } from "@/lib/server/jobs/availability-jobs";
import { checkRateLimit, getRateLimitKeyParts } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inviteCode = typeof body?.invite_code === "string" ? body.invite_code.trim().toUpperCase() : "";
    const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";

    if (!inviteCode) {
      return NextResponse.json({ error: "招待コードを入力してください" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const user = await getRouteUser(request);
    const guestActor = user ? null : await getGuestActorFromRequest(request, supabaseAdmin);
    const rateLimit = checkRateLimit({
      key: `group-join:${getRateLimitKeyParts({
        request,
        userId: user?.id ?? guestActor?.actorId ?? null,
      }).userId}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "参加操作が多すぎます。時間をおいてお試しください" }, { status: 429 });
    }

    const { data: group } = await supabaseAdmin
      .from("groups")
      .select("id, name, notify_threshold, line_group_id")
      .eq("invite_code", inviteCode)
      .single();

    if (!group) {
      return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
    }

    if (!user) {
      if (guestActor) {
        if (guestActor.groupId === group.id) {
          return NextResponse.json(
            { error: "すでにこのグループに参加しています", group },
            { status: 409 }
          );
        }

        const { data: currentGroup } = await supabaseAdmin
          .from("groups")
          .select("id, name")
          .eq("id", guestActor.groupId)
          .maybeSingle();

        return NextResponse.json(
          {
            error: "複数グループを使うにはログインが必要です",
            code: "LOGIN_REQUIRED_FOR_MULTIPLE_GROUPS",
            group,
            current_group: currentGroup,
          },
          { status: 409 }
        );
      }

      if (!displayName) {
        return NextResponse.json(
          {
            error: "表示名を入力してください",
            code: "DISPLAY_NAME_REQUIRED",
            group,
          },
          { status: 400 }
        );
      }

      const { guestToken } = await createGuestMember({
        supabase: supabaseAdmin,
        groupId: group.id,
        displayName,
      });
      const response = NextResponse.json({ group });
      setGuestCookie(response, guestToken);
      return response;
    }

    await ensureProfile(supabaseAdmin, user);

    const { data: existing } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

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
        await runGroupJoinPostSaveJob({
          group,
          futureDates,
        });
      });
    }

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Join unexpected error:", err);
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}
