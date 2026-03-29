import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { ensureProfile } from "@/lib/ensure-profile";

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
    // Get current user from session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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
