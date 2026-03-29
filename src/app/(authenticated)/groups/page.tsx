"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  member_count: number;
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups/mine", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "グループの作成に失敗しました");
        setCreating(false);
        return;
      }

      setShowCreate(false);
      setNewGroupName("");
      setCreating(false);
      fetchGroups();
    } catch {
      setError("グループの作成に失敗しました");
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "参加に失敗しました");
        setCreating(false);
        return;
      }

      setShowJoin(false);
      setInviteCode("");
      setCreating(false);
      fetchGroups();
    } catch {
      setError("参加に失敗しました");
      setCreating(false);
    }
  };

  return (
    <div>
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h1 className="text-center text-lg font-bold">グループ</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(""); }}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            グループを作成
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(""); }}
            className="flex-1 rounded-xl border py-3 text-sm font-bold"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            招待コードで参加
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h3 className="text-sm font-bold">新しいグループ</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="グループ名（例: 大学メンバー）"
              maxLength={30}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)" }}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowCreate(false); setError(""); }} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newGroupName.trim()}
                className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        )}

        {/* Join modal */}
        {showJoin && (
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h3 className="text-sm font-bold">招待コードで参加</h3>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="招待コード（6文字）"
              maxLength={6}
              className="w-full rounded-lg border px-3 py-2.5 text-center text-lg font-mono tracking-widest outline-none focus:border-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)" }}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowJoin(false); setError(""); }} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                キャンセル
              </button>
              <button
                onClick={handleJoin}
                disabled={creating || inviteCode.length < 6}
                className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {creating ? "参加中..." : "参加"}
              </button>
            </div>
          </div>
        )}

        {/* Group list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              まだグループに参加していません
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              グループを作成するか、招待コードで参加しましょう
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors active:bg-gray-50"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div>
                  <p className="font-bold">{group.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {group.member_count}人参加
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6,4 10,8 6,12" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
