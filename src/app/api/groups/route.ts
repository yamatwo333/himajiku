import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Use service role to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const code = generateCode();

  // Create group
  const { data: group, error: createError } = await supabaseAdmin
    .from("groups")
    .insert({
      name: name.trim(),
      invite_code: code,
      created_by: user.id,
    })
    .select()
    .single();

  if (createError) {
    console.error("Group creation error:", createError);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
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
    // Cleanup: delete the group
    await supabaseAdmin.from("groups").delete().eq("id", group.id);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }

  return NextResponse.json({ group });
}
