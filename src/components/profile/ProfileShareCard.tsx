"use client";

import { useMemo, useState } from "react";
import CharacterSticker from "@/components/CharacterSticker";
import { copyText } from "@/lib/clipboard";
import { CHARACTER_ASSETS } from "@/lib/characters";

interface ProfileShareCardProps {
  appUrl: string;
}

export default function ProfileShareCard({ appUrl }: ProfileShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const normalizedAppUrl = useMemo(() => appUrl.replace(/\/+$/, ""), [appUrl]);

  const handleCopy = async () => {
    await copyText(normalizedAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "シェアヒマ",
          text: "ヒマな時間をシェアして、なんとなく集まろう",
          url: normalizedAppUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // cancelled
      }
    }

    await handleCopy();
  };

  return (
    <section
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            このサービスをシェア
          </p>
          <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            友だちにサービスリンクをそのまま共有できます。
          </p>
        </div>

        <div className="flex h-16 w-20 shrink-0 items-center justify-center">
          <CharacterSticker
            src={CHARACTER_ASSETS.profileShare.src}
            alt={CHARACTER_ASSETS.profileShare.alt}
            className="max-h-12 w-auto object-contain"
          />
        </div>
      </div>

      <div
        className="mt-3 rounded-xl border px-3 py-2 text-xs break-all"
        style={{
          backgroundColor: "rgba(14, 165, 233, 0.06)",
          borderColor: "rgba(14, 165, 233, 0.14)",
          color: "var(--color-text-secondary)",
        }}
      >
        {normalizedAppUrl}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={handleShare}
          className="rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {shared ? "共有しました" : "共有する"}
        </button>
        <button
          onClick={handleCopy}
          className="rounded-xl border px-4 py-3 text-sm font-bold transition active:scale-[0.98]"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "rgba(14, 165, 233, 0.18)",
            color: "var(--color-primary)",
          }}
        >
          {copied ? "コピーしました" : "リンクをコピー"}
        </button>
      </div>
    </section>
  );
}
