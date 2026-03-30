import Image from "next/image";

interface BrandLogoProps {
  variant?: "wordmark" | "lockup";
  className?: string;
}

const LOGO_CONFIG = {
  wordmark: {
    src: "/brand-wordmark.png",
    width: 620,
    height: 220,
    containerClassName: "h-[30px] w-[132px]",
    maskHeightClassName: "h-3",
  },
  lockup: {
    src: "/brand-lockup.png",
    width: 980,
    height: 260,
    containerClassName: "h-[46px] w-[220px]",
    maskHeightClassName: "h-3.5",
  },
} as const;

export default function BrandLogo({
  variant = "wordmark",
  className = "",
}: BrandLogoProps) {
  const config = LOGO_CONFIG[variant];

  return (
    <span
      className={`relative inline-flex overflow-hidden align-middle ${config.containerClassName} ${className}`.trim()}
      aria-label="シェアヒマ"
    >
      <Image
        src={config.src}
        alt="シェアヒマ"
        width={config.width}
        height={config.height}
        priority
        className="h-auto w-full max-w-none object-top"
      />
      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${config.maskHeightClassName}`}
        style={{ background: "linear-gradient(to bottom, rgba(240, 249, 255, 0), var(--color-bg) 72%)" }}
      />
    </span>
  );
}
