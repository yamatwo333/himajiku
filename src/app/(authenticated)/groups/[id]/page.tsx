import { redirect } from "next/navigation";
import GroupDetailClient from "@/components/groups/GroupDetailClient";
import { getGroupDetailForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/groups/${groupId}`)}`);
  }

  const result = await getGroupDetailForUser(createAdminClient(), groupId, user.id);

  if (!result) {
    redirect("/groups");
  }

  return (
    <GroupDetailClient
      currentUserId={user.id}
      groupId={groupId}
      initialGroup={result.group}
      initialMembers={result.members}
    />
  );
}
