import { redirect } from "next/navigation";
import GroupDetailClient from "@/components/groups/GroupDetailClient";
import { getE2EGroupDetail, isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import { getGroupDetailForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const userId = await getRequestUserId();

  if (!userId) {
    redirect(`/login?redirect=${encodeURIComponent(`/groups/${groupId}`)}`);
  }

  if (isE2EUser(userId)) {
    const result = getE2EGroupDetail(userId, groupId);

    if (!result) {
      redirect("/groups");
    }

    return (
      <GroupDetailClient
        currentUserId={userId}
        groupId={groupId}
        initialGroup={result.group}
        initialMembers={result.members}
      />
    );
  }

  const result = await getGroupDetailForUser(createAdminClient(), groupId, userId);

  if (!result) {
    redirect("/groups");
  }

  return (
    <GroupDetailClient
      currentUserId={userId}
      groupId={groupId}
      initialGroup={result.group}
      initialMembers={result.members}
    />
  );
}
