import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserGroupIds(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  return data?.map((membership) => membership.group_id) ?? [];
}

export async function getGroupMemberIds(
  supabase: SupabaseClient,
  groupId: string
) {
  const { data } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  return data?.map((member) => member.user_id) ?? [];
}

export async function isGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
) {
  const { data } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export async function countMembersByGroupIds(
  supabase: SupabaseClient,
  groupIds: string[]
) {
  if (groupIds.length === 0) {
    return new Map<string, number>();
  }

  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  const counts = new Map<string, number>();

  for (const groupId of groupIds) {
    counts.set(groupId, 0);
  }

  for (const row of data ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }

  return counts;
}

export async function getGroupOwnerId(
  supabase: SupabaseClient,
  groupId: string
) {
  const { data } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  return data?.created_by ?? null;
}
