"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import GroupDangerZone from "@/components/groups/GroupDangerZone";
import GroupInviteSection from "@/components/groups/GroupInviteSection";
import GroupLineLinkSection from "@/components/groups/GroupLineLinkSection";
import GroupMembersSection from "@/components/groups/GroupMembersSection";
import GroupSettingsSection from "@/components/groups/GroupSettingsSection";
import type { GroupDetail, GroupMember } from "@/components/groups/types";
import { copyText } from "@/lib/clipboard";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [editName, setEditName] = useState("");
  const [notifyThreshold, setNotifyThreshold] = useState(3);
  const [lineLinked, setLineLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiresAt, setLinkCodeExpiresAt] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
      }

      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      setGroup(data.group);
      setMembers(data.members || []);
      setEditName(data.group.name);
      setNotifyThreshold(data.group.notify_threshold);
      setLineLinked(Boolean(data.group.line_group_id));
    } catch {
      // ignore
    }

    setLoading(false);
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 100);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (initialLoadRef.current || loading) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!editName.trim()) {
        return;
      }

      setSaving(true);
      await fetch(`/api/groups/${groupId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          notify_threshold: notifyThreshold,
        }),
      });
      setSaving(false);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editName, notifyThreshold, groupId, loading]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/groups");
  }, [router]);

  const handleCopyCode = useCallback(async () => {
    if (!group) {
      return;
    }

    await copyText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [group]);

  const handleCopyUrl = useCallback(async () => {
    if (!group) {
      return;
    }

    await copyText(`${window.location.origin}/join?code=${group.invite_code}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [group]);

  const handleShare = useCallback(async () => {
    if (!group) {
      return;
    }

    const url = `${window.location.origin}/join?code=${group.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `シェアヒマ - ${group.name}`,
          text: `「${group.name}」に参加しよう！`,
          url,
        });
      } catch {
        // cancelled
      }
      return;
    }

    await handleCopyUrl();
  }, [group, handleCopyUrl]);

  const handleGenerateLinkCode = useCallback(async () => {
    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/line-link`, {
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setLinkCode(data.code);
      setLinkCodeExpiresAt(data.expiresAt);
    } catch {
      // ignore
    }
    setGeneratingCode(false);
  }, [groupId]);

  const handleUnlink = useCallback(async () => {
    setUnlinking(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/line-link`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      setLineLinked(false);
      setLinkCode(null);
      setLinkCodeExpiresAt(null);
    } catch {
      // ignore
    }
    setUnlinking(false);
  }, [groupId]);

  const handleCopyLinkCode = useCallback(async () => {
    if (!linkCode) {
      return;
    }

    await copyText(`連携 ${linkCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [linkCode]);

  const handleTransfer = useCallback(
    async (newOwnerId: string) => {
      setTransferring(true);
      try {
        const response = await fetch(`/api/groups/${groupId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_owner_id: newOwnerId }),
        });

        if (response.ok) {
          setTransferTarget(null);
          await fetchData();
        }
      } catch {
        // ignore
      }
      setTransferring(false);
    },
    [fetchData, groupId]
  );

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
    router.push("/groups");
  }, [groupId, router]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    router.push("/groups");
  }, [groupId, router]);

  const isOwner = group?.created_by === currentUserId;
  const isCodeExpired = linkCodeExpiresAt ? new Date(linkCodeExpiresAt) < new Date() : false;

  if (loading) {
    return (
      <div>
        <PageHeader onBack={handleBack} />
        <PageSpinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <PageHeader onBack={handleBack} />
        <p className="py-20 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          グループが見つかりません
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        onBack={handleBack}
        trailing={
          saving ? (
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              保存中...
            </span>
          ) : null
        }
      />

      <div className="space-y-6 px-4 pt-5 pb-8">
        <GroupInviteSection
          group={group}
          copied={copied}
          copiedUrl={copiedUrl}
          onCopyCode={handleCopyCode}
          onCopyUrl={handleCopyUrl}
          onShare={handleShare}
        />

        <GroupMembersSection
          members={members}
          ownerId={group.created_by}
          currentUserId={currentUserId}
          isOwner={Boolean(isOwner)}
          transferTarget={transferTarget}
          transferring={transferring}
          onToggleTransferTarget={(memberId) =>
            setTransferTarget((current) => (current === memberId ? null : memberId))
          }
          onCancelTransfer={() => setTransferTarget(null)}
          onConfirmTransfer={handleTransfer}
        />

        <GroupSettingsSection
          isOwner={Boolean(isOwner)}
          groupName={group.name}
          editName={editName}
          notifyThreshold={notifyThreshold}
          onEditNameChange={setEditName}
          onNotifyThresholdChange={setNotifyThreshold}
        />

        <GroupLineLinkSection
          isOwner={Boolean(isOwner)}
          lineLinked={lineLinked}
          linkCode={linkCode}
          isCodeExpired={isCodeExpired}
          generatingCode={generatingCode}
          unlinking={unlinking}
          copiedCode={copiedCode}
          onGenerateLinkCode={handleGenerateLinkCode}
          onUnlink={handleUnlink}
          onCopyLinkCode={handleCopyLinkCode}
        />

        <GroupDangerZone
          isOwner={Boolean(isOwner)}
          memberCount={members.length}
          showConfirm={showDeleteConfirm}
          leaving={leaving}
          deleting={deleting}
          onOpenConfirm={() => setShowDeleteConfirm(true)}
          onCloseConfirm={() => setShowDeleteConfirm(false)}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
