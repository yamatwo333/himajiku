import { redirect } from "next/navigation";
import GroupsPageClient from "@/components/groups/GroupsPageClient";
import { getE2EGroupSummaries, isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import { getGroupSummariesForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function GroupsPage() {
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?redirect=%2Fgroups");
  }

  if (isE2EUser(userId)) {
    return <GroupsPageClient initialGroups={getE2EGroupSummaries(userId)} />;
  }

  const groups = await getGroupSummariesForUser(createAdminClient(), userId);

  return <GroupsPageClient initialGroups={groups} />;
}
