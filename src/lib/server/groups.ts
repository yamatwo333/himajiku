import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServerGroupSummary {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold: number;
  member_count: number;
}

export interface ServerGroupDetail {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold: number;
  line_group_id: string | null;
}

export interface ServerGroupMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

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

export async function getGroupSummariesForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const groupIds = await getUserGroupIds(supabase, userId);

  if (groupIds.length === 0) {
    return [];
  }

  const [{ data: groups }, memberCounts] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, invite_code, created_by, notify_threshold")
      .in("id", groupIds),
    countMembersByGroupIds(supabase, groupIds),
  ]);

  return (groups ?? []).map((group) => ({
    ...group,
    member_count: memberCounts.get(group.id) ?? 0,
  })) satisfies ServerGroupSummary[];
}

export async function getGroupDetailForUser(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
) {
  if (!(await isGroupMember(supabase, groupId, userId))) {
    return null;
  }

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, invite_code, created_by, notify_threshold, line_group_id")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, joined_at, user:profiles(display_name, avatar_url)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true }),
  ]);

  if (!group) {
    return null;
  }

  const memberProfiles = (members ?? []).map((member) => {
    const profile = Array.isArray(member.user) ? member.user[0] : member.user;

    return {
      user_id: member.user_id,
      display_name: profile?.display_name || "ユーザー",
      avatar_url: profile?.avatar_url || null,
      joined_at: member.joined_at,
    };
  }) satisfies ServerGroupMember[];

  return {
    group: group satisfies ServerGroupDetail,
    members: memberProfiles,
  };
}
