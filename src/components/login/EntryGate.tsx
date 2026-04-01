"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function hasSupabaseAuthCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith("sb-") && cookie.includes("auth-token"));
}

export default function EntryGate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirectTo = (path: string) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        router.replace(path);
      });
    };

    if (!hasSupabaseAuthCookie()) {
      redirectTo("/login");
      return () => {
        cancelled = true;
      };
    }

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("status failed");
        }

        const data = (await response.json()) as { authenticated?: boolean };
        redirectTo(data.authenticated ? "/calendar" : "/login");
      } catch {
        redirectTo("/login");
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <BrandLogo variant="lockup" className="mx-auto" />
      <div
        className="mt-6 flex items-center gap-2 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span
          className="h-2.5 w-2.5 animate-pulse rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
        読み込み中...
      </div>
    </div>
  );
}
