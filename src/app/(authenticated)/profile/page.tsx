import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileAboutCard from "@/components/profile/ProfileAboutCard";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import { getRequestUserId } from "@/lib/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ProfilePage() {
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?redirect=%2Fprofile");
  }

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return (
    <div>
      <PageHeader title="マイページ" />

      <div className="space-y-6 px-4 pt-6">
        <ProfileSummaryCard
          displayName={profile?.display_name || "ユーザー"}
          avatarUrl={profile?.avatar_url || null}
        />
        <ProfileAboutCard />
        <ProfileLogoutButton />
      </div>
    </div>
  );
}
