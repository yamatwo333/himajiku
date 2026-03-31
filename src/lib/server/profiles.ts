import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function getProfileMap(
  supabase: SupabaseClient,
  userIds: string[]
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", uniqueUserIds);

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}
