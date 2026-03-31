import { NextRequest, NextResponse } from "next/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteUser } from "@/lib/supabase/route";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です。再度ログインしてください。" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = body?.name;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "グループ名を入力してください" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Ensure profile exists (may not exist if trigger failed during signup)
    await ensureProfile(supabaseAdmin, user);

    // Create group with retry for duplicate invite codes
    let code = generateCode();
    let retries = 3;
    let group = null;
    let createError = null;

    while (retries > 0) {
      const result = await supabaseAdmin
        .from("groups")
        .insert({
          name: name.trim(),
          invite_code: code,
          created_by: user.id,
        })
        .select()
        .single();

      if (result.error && result.error.code === "23505") {
        code = generateCode();
        retries--;
        continue;
      }

      createError = result.error;
      group = result.data;
      break;
    }

    if (createError || !group) {
      console.error("Group creation error:", createError);
      return NextResponse.json(
        { error: `グループ作成に失敗しました` },
        { status: 500 }
      );
    }

    // Add creator as member
    const { error: memberError } = await supabaseAdmin
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
      });

    if (memberError) {
      console.error("Member add error:", memberError);
      await supabaseAdmin.from("groups").delete().eq("id", group.id);
      return NextResponse.json(
        { error: "メンバー追加に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
