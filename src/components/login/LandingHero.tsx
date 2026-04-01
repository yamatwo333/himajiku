import { Suspense } from "react";
import BrandLogo from "@/components/BrandLogo";
import LandingHeroActions from "@/components/login/LandingHeroActions";

export default function LandingHero() {
  return (
    <div className="flex min-h-svh flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <BrandLogo variant="lockup" className="mx-auto" />
        <p
          className="mt-4 max-w-[320px] text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ヒマな時間をシェアして、なんとなく集まろう
        </p>

        <div
          className="mt-8 w-full max-w-[320px] rounded-[28px] border px-5 py-5 shadow-sm"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.86)",
            borderColor: "rgba(14, 165, 233, 0.14)",
          }}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/80 px-3 py-3">
              <div className="text-xl">📅</div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                ヒマをシェア
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-3">
              <div className="text-xl">👋</div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                友達と共有
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-3">
              <div className="text-xl">🔔</div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                LINEに通知
              </p>
            </div>
          </div>

          <Suspense fallback={<div className="mt-5 h-14 rounded-2xl bg-white/70" />}>
            <LandingHeroActions />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
