"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import GroupDangerZone from "@/components/groups/GroupDangerZone";
import GroupInviteSection from "@/components/groups/GroupInviteSection";
import GroupLineLinkSection from "@/components/groups/GroupLineLinkSection";
import GroupMembersSection from "@/components/groups/GroupMembersSection";
import GroupSettingsSection from "@/components/groups/GroupSettingsSection";
import type { GroupDetail, GroupMember } from "@/components/groups/types";
import { copyText } from "@/lib/clipboard";
import { buildCalendarUrl, readStoredCalendarMonth } from "@/lib/calendar";

interface GroupDetailClientProps {
  currentUserId: string;
  groupId: string;
  initialGroup: GroupDetail;
  initialMembers: GroupMember[];
}

export default function GroupDetailClient({
  currentUserId,
  groupId,
  initialGroup,
  initialMembers,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail>(initialGroup);
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [editName, setEditName] = useState(initialGroup.name);
  const [notifyThreshold, setNotifyThreshold] = useState(initialGroup.notify_threshold);
  const [lineLinked, setLineLinked] = useState(Boolean(initialGroup.line_group_id));
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiresAt, setLinkCodeExpiresAt] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const refreshGroupDetail = useCallback(async () => {
    const response = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setGroup(data.group);
    setMembers(data.members || []);
    setEditName(data.group.name);
    setNotifyThreshold(data.group.notify_threshold);
    setLineLinked(Boolean(data.group.line_group_id));
  }, [groupId]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/groups");
  }, [router]);

  const handleOpenCalendar = useCallback(() => {
    router.push(buildCalendarUrl(groupId, readStoredCalendarMonth()));
  }, [groupId, router]);

  const handleCopyCode = useCallback(async () => {
    await copyText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [group.invite_code]);

  const handleCopyUrl = useCallback(async () => {
    await copyText(`${window.location.origin}/join?code=${group.invite_code}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [group.invite_code]);

  const handleShare = useCallback(async () => {
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
  }, [group.invite_code, group.name, handleCopyUrl]);

  const scheduleSave = useCallback(
    (nextName: string, nextThreshold: number) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!nextName.trim()) {
          return;
        }

        setSaving(true);
        await fetch(`/api/groups/${groupId}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nextName.trim(),
            notify_threshold: nextThreshold,
          }),
        });
        setSaving(false);
      }, 500);
    },
    [groupId]
  );

  const handleEditNameChange = useCallback(
    (nextName: string) => {
      setEditName(nextName);
      setGroup((current) => ({ ...current, name: nextName }));
      scheduleSave(nextName, notifyThreshold);
    },
    [notifyThreshold, scheduleSave]
  );

  const handleNotifyThresholdChange = useCallback(
    (nextThreshold: number) => {
      setNotifyThreshold(nextThreshold);
      setGroup((current) => ({ ...current, notify_threshold: nextThreshold }));
      scheduleSave(editName, nextThreshold);
    },
    [editName, scheduleSave]
  );

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
      setGroup((current) => ({ ...current, line_group_id: null }));
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
          await refreshGroupDetail();
        }
      } catch {
        // ignore
      }

      setTransferring(false);
    },
    [groupId, refreshGroupDetail]
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

  const isOwner = group.created_by === currentUserId;
  const isCodeExpired = linkCodeExpiresAt ? new Date(linkCodeExpiresAt) < new Date() : false;

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
        <button
          onClick={handleOpenCalendar}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: "var(--color-primary)",
          }}
        >
          このグループのカレンダーを見る
        </button>

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
          isOwner={isOwner}
          transferTarget={transferTarget}
          transferring={transferring}
          onToggleTransferTarget={(memberId) =>
            setTransferTarget((current) => (current === memberId ? null : memberId))
          }
          onCancelTransfer={() => setTransferTarget(null)}
          onConfirmTransfer={handleTransfer}
        />

        <GroupSettingsSection
          isOwner={isOwner}
          groupName={group.name}
          editName={editName}
          notifyThreshold={notifyThreshold}
          onEditNameChange={handleEditNameChange}
          onNotifyThresholdChange={handleNotifyThresholdChange}
        />

        <GroupLineLinkSection
          isOwner={isOwner}
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
          isOwner={isOwner}
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
