import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

interface LandingHeroProps {
  ctaHref?: string;
}

export default function LandingHero({
  ctaHref = "/login",
}: LandingHeroProps) {
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

          <Link
            href={ctaHref}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97]"
            style={{ backgroundColor: "#06C755" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.07 3.57 7.47 8.4 8.29.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.39 4.89-2.88 6.67-4.93C20.63 14.48 22 12.63 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v3.75h1.25a.75.75 0 010 1.5zm2.5-.75a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm4.5 0a.75.75 0 01-1.35.45L12.5 10.3v2.45a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.35-.45l2.15 2.9V8.25a.75.75 0 011.5 0v4.5zm3.25-3a.75.75 0 010 1.5h-1.25v1h1.25a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-1.25v.5h1.25z" />
            </svg>
            はじめる
          </Link>
        </div>
      </div>
    </div>
  );
}
