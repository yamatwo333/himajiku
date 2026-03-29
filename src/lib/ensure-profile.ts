import { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(supabaseAdmin: SupabaseClient, user: User) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabaseAdmin.from("profiles").insert({
      id: user.id,
      display_name:
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "ユーザー",
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
}
