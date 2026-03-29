"use client";

export default function DayDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        ページの読み込みに失敗しました
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {error.message}
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-xl px-6 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        再読み込み
      </button>
    </div>
  );
}
