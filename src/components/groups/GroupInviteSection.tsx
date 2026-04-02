"use client";

import { useMemo } from "react";
import type { GroupDetail } from "@/components/groups/types";

interface GroupInviteSectionProps {
  group: GroupDetail;
  copied: boolean;
  copiedUrl: boolean;
  onCopyCode: () => void;
  onCopyUrl: () => void;
  onShare: () => void;
}

export default function GroupInviteSection({
  group,
  copied,
  copiedUrl,
  onCopyCode,
  onCopyUrl,
  onShare,
}: GroupInviteSectionProps) {
  const joinPath = `/join?code=${group.invite_code}`;
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return joinPath;
    }

    return `${window.location.origin}${joinPath}`;
  }, [joinPath]);

  return (
    <section
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <h2 className="text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
        友達を招待
      </h2>
      <button
        onClick={onShare}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        招待リンクを共有
      </button>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={joinUrl}
          suppressHydrationWarning
          className="flex-1 rounded-lg border px-3 py-2 text-xs font-mono outline-none"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
          }}
        />
        <button
          onClick={onCopyUrl}
          className="shrink-0 rounded-lg border px-3 py-2 text-xs font-bold"
          style={{
            borderColor: copiedUrl ? "var(--color-primary)" : "var(--color-border)",
            color: copiedUrl ? "var(--color-primary)" : "var(--color-text)",
          }}
        >
          {copiedUrl ? "コピー済" : "コピー"}
        </button>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            招待コード:
          </span>{" "}
          <span className="font-mono font-bold tracking-widest">{group.invite_code}</span>
        </div>
        <button
          onClick={onCopyCode}
          className="rounded-lg border px-2 py-1 text-xs"
          style={{
            borderColor: copied ? "var(--color-primary)" : "var(--color-border)",
            color: copied ? "var(--color-primary)" : "var(--color-text-secondary)",
          }}
        >
          {copied ? "コピー済" : "コピー"}
        </button>
      </div>
    </section>
  );
}
