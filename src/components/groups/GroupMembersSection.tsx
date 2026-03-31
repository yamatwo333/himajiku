"use client";

import ProfileAvatar from "@/components/ProfileAvatar";
import type { GroupMember } from "@/components/groups/types";

interface GroupMembersSectionProps {
  members: GroupMember[];
  ownerId: string;
  currentUserId: string | null;
  isOwner: boolean;
  transferTarget: string | null;
  transferring: boolean;
  onToggleTransferTarget: (memberId: string) => void;
  onCancelTransfer: () => void;
  onConfirmTransfer: (memberId: string) => void;
}

export default function GroupMembersSection({
  members,
  ownerId,
  currentUserId,
  isOwner,
  transferTarget,
  transferring,
  onToggleTransferTarget,
  onCancelTransfer,
  onConfirmTransfer,
}: GroupMembersSectionProps) {
  const transferTargetMember = members.find(
    (member) => member.user_id === transferTarget
  );

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
        メンバー ({members.length}人)
      </h2>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center gap-3 rounded-xl border p-3"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <ProfileAvatar
              name={member.display_name}
              avatarUrl={member.avatar_url}
              size="sm"
            />
            <div className="flex-1">
              <p className="font-medium">{member.display_name}</p>
              {member.user_id === ownerId ? (
                <span className="text-xs" style={{ color: "var(--color-primary)" }}>
                  管理者
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {member.user_id === currentUserId ? (
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  あなた
                </span>
              ) : null}
              {isOwner && member.user_id !== currentUserId ? (
                <button
                  onClick={() => onToggleTransferTarget(member.user_id)}
                  className="rounded-lg border px-2 py-1 text-[10px]"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  管理者にする
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {transferTargetMember ? (
        <div
          className="mt-2 rounded-xl border p-3 space-y-2"
          style={{
            borderColor: "var(--color-primary)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          <p className="text-sm">
            <span className="font-bold">{transferTargetMember.display_name}</span>
            を管理者にしますか？
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            あなたは管理者ではなくなりますが、メンバーとして残ります。
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelTransfer}
              className="flex-1 rounded-lg border py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              キャンセル
            </button>
            <button
              onClick={() => onConfirmTransfer(transferTargetMember.user_id)}
              disabled={transferring}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {transferring ? "変更中..." : "変更する"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
