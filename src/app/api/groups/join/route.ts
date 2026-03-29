import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  // Get current user
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invite_code } = await request.json();
  if (!invite_code || !invite_code.trim()) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find group by invite code
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id, name")
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
    return NextResponse.json({ error: "すでにこのグループに参加しています" }, { status: 409 });
  }

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

  return NextResponse.json({ group });
}
