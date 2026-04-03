import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileAboutCard from "@/components/profile/ProfileAboutCard";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import ProfileShareCard from "@/components/profile/ProfileShareCard";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import { getE2EProfile, isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sharehima.vercel.app";

export default async function ProfilePage() {
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?redirect=%2Fprofile");
  }

  const profile = isE2EUser(userId)
    ? getE2EProfile(userId)
    : (
        await createAdminClient()
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", userId)
          .maybeSingle()
      ).data;

  return (
    <div>
      <PageHeader title="マイページ" />

      <div className="space-y-6 px-4 pt-6" data-testid="profile-page-content">
        <ProfileSummaryCard
          displayName={profile?.display_name || "ユーザー"}
          avatarUrl={profile?.avatar_url || null}
        />
        <ProfileAboutCard />
        <ProfileShareCard appUrl={appUrl} />
        <ProfileLogoutButton />
      </div>
    </div>
  );
}
