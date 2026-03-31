import { redirect } from "next/navigation";
import GroupsPageClient from "@/components/groups/GroupsPageClient";
import { getGroupSummariesForUser } from "@/lib/server/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fgroups");
  }

  const groups = await getGroupSummariesForUser(createAdminClient(), user.id);

  return <GroupsPageClient initialGroups={groups} />;
}
