import Image from "next/image";

interface BrandLogoProps {
  variant?: "wordmark" | "lockup";
  className?: string;
}

const BRAND_FONT_FAMILY =
  '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Avenir Next Rounded", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';

function WordmarkText({ size }: { size: "wordmark" | "lockup" }) {
  const isLockup = size === "lockup";
  const textSizeClass = isLockup ? "text-[2.3rem]" : "text-[1.36rem]";

  return (
    <span
      className={`inline-flex items-baseline leading-none ${
        isLockup ? "gap-[0.08em]" : "gap-[0.04em]"
      }`}
      style={{
        fontFamily: BRAND_FONT_FAMILY,
        fontWeight: 900,
        letterSpacing: isLockup ? "0.05em" : "0.04em",
        textShadow: "0 1px 0 rgba(255, 255, 255, 0.72)",
      }}
      aria-label="シェアヒマ"
    >
      <span className={textSizeClass} style={{ color: "var(--color-text)" }}>
        シェア
      </span>
      <span className={textSizeClass} style={{ color: "var(--color-primary)" }}>
        ヒマ
      </span>
    </span>
  );
}

export default function BrandLogo({
  variant = "wordmark",
  className = "",
}: BrandLogoProps) {
  if (variant === "lockup") {
    return (
      <div
        className={`relative inline-flex items-center gap-3.5 ${className}`.trim()}
        aria-label="シェアヒマ"
      >
        <span
          className="pointer-events-none absolute inset-x-4 inset-y-4 -z-10 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0) 72%)",
          }}
        />
        <Image
          src="/icon.png"
          alt=""
          width={76}
          height={76}
          priority
          className="h-[72px] w-[72px] shrink-0 rounded-[24px] object-contain shadow-[0_14px_28px_rgba(14,165,233,0.12)]"
        />
        <div className="text-left">
          <WordmarkText size="lockup" />
          <p
            className="mt-1 pl-0.5 text-[0.84rem] font-semibold leading-none"
            style={{
              color: "var(--color-text)",
              fontFamily: BRAND_FONT_FAMILY,
              letterSpacing: "0.08em",
            }}
          >
            ShareHima
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`.trim()}
      aria-label="シェアヒマ"
    >
      <Image
        src="/icon.png"
        alt=""
        width={36}
        height={36}
        className="h-8 w-8 shrink-0 rounded-xl object-contain shadow-[0_8px_18px_rgba(14,165,233,0.1)]"
      />
      <WordmarkText size="wordmark" />
    </div>
  );
}
