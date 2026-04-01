"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import LandingHero from "@/components/login/LandingHero";

function BootScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <BrandLogo variant="lockup" className="mx-auto" />
      <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        <span
          className="h-2.5 w-2.5 animate-pulse rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
        読み込み中...
      </div>
    </div>
  );
}

export default function EntryGate() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "guest">("checking");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("status failed");
        }

        const data = (await response.json()) as { authenticated?: boolean };

        if (cancelled) {
          return;
        }

        if (data.authenticated) {
          startTransition(() => {
            router.replace("/calendar");
          });
          return;
        }

        setPhase("guest");
      } catch {
        if (!cancelled) {
          setPhase("guest");
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (phase === "checking") {
    return <BootScreen />;
  }

  return <LandingHero ctaHref="/login" />;
}
