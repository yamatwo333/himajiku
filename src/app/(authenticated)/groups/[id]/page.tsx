"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface GroupDetail {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold: number;
  line_group_id: string | null;
  line_channel_access_token: string | null;
}

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupData) setGroup(groupData);

    const { data: membersData } = await supabase
      .from("group_members")
      .select("user_id, joined_at, profile:profiles(display_name, avatar_url)")
      .eq("group_id", groupId);

    if (membersData) {
      setMembers(
        membersData.map((m: any) => ({
          user_id: m.user_id,
          display_name: m.profile.display_name,
          avatar_url: m.profile.avatar_url,
          joined_at: m.joined_at,
        }))
      );
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = group.invite_code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (!currentUserId) return;
    setLeaving(true);

    const supabase = createClient();
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", currentUserId);

    router.push("/groups");
  };

  const isOwner = group?.created_by === currentUserId;

  if (loading) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
        </header>
        <p className="py-20 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>グループが見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
          <h1 className="text-lg font-bold">{group.name}</h1>
        </div>
        {isOwner && (
          <button
            onClick={() => router.push(`/groups/${groupId}/settings`)}
            className="rounded-lg p-1 active:bg-gray-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </header>

      <div className="px-4 pt-5 pb-8 space-y-6">
        {/* Invite code */}
        <section className="rounded-xl border p-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>招待コード</h2>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-mono font-bold tracking-widest">{group.invite_code}</span>
            <button
              onClick={handleCopyCode}
              className="rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                borderColor: copied ? "var(--color-primary)" : "var(--color-border)",
                color: copied ? "var(--color-primary)" : "var(--color-text)",
              }}
            >
              {copied ? "コピー済み" : "コピー"}
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            友達にこのコードを共有して招待しましょう
          </p>
        </section>

        {/* Members */}
        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            メンバー ({members.length}人)
          </h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.display_name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                    {m.display_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{m.display_name}</p>
                  {m.user_id === group.created_by && (
                    <span className="text-xs" style={{ color: "var(--color-primary)" }}>管理者</span>
                  )}
                </div>
                {m.user_id === currentUserId && (
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>あなた</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Leave group */}
        {!isOwner && (
          <section>
            {showLeaveConfirm ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-600">本当にこのグループを退出しますか？</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                    キャンセル
                  </button>
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {leaving ? "退出中..." : "退出する"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full rounded-xl border py-3 text-sm text-red-500"
                style={{ borderColor: "var(--color-border)" }}
              >
                グループを退出
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
