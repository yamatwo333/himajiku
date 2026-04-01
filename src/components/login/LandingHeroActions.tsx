"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuthState = "unknown" | "guest" | "authenticated";

function PrimaryAction({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "line" | "primary";
}) {
  return (
    <Link
      href={href}
      className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97]"
      style={{
        backgroundColor: tone === "line" ? "#06C755" : "var(--color-primary)",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.07 3.57 7.47 8.4 8.29.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.39 4.89-2.88 6.67-4.93C20.63 14.48 22 12.63 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v3.75h1.25a.75.75 0 010 1.5zm2.5-.75a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm4.5 0a.75.75 0 01-1.35.45L12.5 10.3v2.45a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.35-.45l2.15 2.9V8.25a.75.75 0 011.5 0v4.5zm3.25-3a.75.75 0 010 1.5h-1.25v1h1.25a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-1.25v.5h1.25z" />
      </svg>
      {label}
    </Link>
  );
}

export default function LandingHeroActions() {
  const [authState, setAuthState] = useState<AuthState>("unknown");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("status failed");
        }

        const data = (await response.json()) as { authenticated?: boolean };
        if (!cancelled) {
          setAuthState(data.authenticated ? "authenticated" : "guest");
        }
      } catch {
        if (!cancelled) {
          setAuthState("guest");
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === "authenticated") {
    return (
      <>
        <div
          className="mt-5 rounded-2xl border px-4 py-3 text-left text-sm"
          style={{
            backgroundColor: "rgba(14, 165, 233, 0.08)",
            borderColor: "rgba(14, 165, 233, 0.2)",
            color: "var(--color-text)",
          }}
        >
          ログイン済みです。すぐにカレンダーを開けます。
        </div>
        <PrimaryAction href="/calendar" label="カレンダーを開く" tone="primary" />
      </>
    );
  }

  return <PrimaryAction href="/login" label="はじめる" tone="line" />;
}
