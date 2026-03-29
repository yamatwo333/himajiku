"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
          .select("*")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setDisplayName(profile.display_name);
              setAvatarUrl(profile.avatar_url);
            }
            setLoading(false);
          });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div>
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h1 className="text-center text-lg font-bold">マイページ</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }}
          />
        </div>
      ) : (
        <div className="space-y-6 px-4 pt-6">
          {/* User info */}
          <section className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {displayName.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-lg font-bold">{displayName}</p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                LINE連携済み
              </p>
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-2">
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--color-text-secondary)" }}
            >
              設定
            </h2>
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-red-500"
              >
                <span>ログアウト</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
