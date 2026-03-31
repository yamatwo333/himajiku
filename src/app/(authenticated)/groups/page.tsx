"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import GroupsComposerSection from "@/components/groups/GroupsComposerSection";
import GroupsOverviewList from "@/components/groups/GroupsOverviewList";
import type { GroupSummary } from "@/components/groups/types";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<"create" | "join" | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
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
        setSubmitting(false);
        return;
      }

      setActiveMode(null);
      setNewGroupName("");
      setSubmitting(false);
      await fetchGroups();
    } catch {
      setError("グループの作成に失敗しました");
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setSubmitting(true);
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
        setSubmitting(false);
        return;
      }

      setActiveMode(null);
      setInviteCode("");
      setSubmitting(false);
      await fetchGroups();
    } catch {
      setError("参加に失敗しました");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="グループ" />

      <div className="px-4 pt-4 pb-8 space-y-4">
        <GroupsComposerSection
          activeMode={activeMode}
          groupName={newGroupName}
          inviteCode={inviteCode}
          error={error}
          submitting={submitting}
          onSelectMode={(mode) => {
            setActiveMode(mode);
            setError("");
            if (mode === "create") {
              setInviteCode("");
            } else {
              setNewGroupName("");
            }
          }}
          onClose={() => {
            setActiveMode(null);
            setError("");
          }}
          onGroupNameChange={setNewGroupName}
          onInviteCodeChange={setInviteCode}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />

        <GroupsOverviewList
          groups={groups}
          loading={loading}
          onOpenGroup={(groupId) => router.push(`/groups/${groupId}`)}
        />
      </div>
    </div>
  );
}
