"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import ProfileAboutCard from "@/components/profile/ProfileAboutCard";
import ProfileLogoutButton from "@/components/profile/ProfileLogoutButton";
import ProfileSummaryCard from "@/components/profile/ProfileSummaryCard";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setDisplayName(profile.display_name);
              setAvatarUrl(profile.avatar_url);
            }
            setLoading(false);
          });
        return;
      }

      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div>
      <PageHeader title="マイページ" />

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-6 px-4 pt-6">
          <ProfileSummaryCard displayName={displayName} avatarUrl={avatarUrl} />
          <ProfileAboutCard />
          <ProfileLogoutButton onLogout={handleLogout} />
        </div>
      )}
    </div>
  );
}
