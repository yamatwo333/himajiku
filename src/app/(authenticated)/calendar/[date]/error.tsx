"use client";

import CharacterSticker from "@/components/CharacterSticker";
import { CHARACTER_ASSETS } from "@/lib/characters";

export default function DayDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div
        className="w-full max-w-sm rounded-2xl border px-5 py-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <CharacterSticker
          src={CHARACTER_ASSETS.stormCloud.src}
          alt={CHARACTER_ASSETS.stormCloud.alt}
          className="mx-auto mb-4 h-20 w-auto object-contain"
        />
        <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
          ページの読み込みに失敗しました
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          通信状況を確認して、もう一度お試しください。
        </p>
        <p
          className="mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed"
          style={{
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text-secondary)",
          }}
        >
          {error.message}
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 w-full rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
