import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileAboutCard from "@/components/profile/ProfileAboutCard";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fprofile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
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
