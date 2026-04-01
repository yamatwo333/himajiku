import Image from "next/image";

interface BrandLogoProps {
  variant?: "wordmark" | "lockup";
  className?: string;
}

const LOGIN_LOGO = {
  src: "/brand/login-lockup.png",
  width: 804,
  height: 358,
};

const HEADER_ICON = {
  src: "/brand/header-icon.png",
  width: 206,
  height: 138,
};

const HEADER_WORDMARK = {
  src: "/brand/header-katakana.png",
  width: 576,
  height: 128,
};

export default function BrandLogo({
  variant = "wordmark",
  className = "",
}: BrandLogoProps) {
  if (variant === "lockup") {
    return (
      <div className={`flex w-full justify-center ${className}`.trim()}>
        <Image
          src={LOGIN_LOGO.src}
          alt="シェアヒマ"
          width={LOGIN_LOGO.width}
          height={LOGIN_LOGO.height}
          priority
          sizes="(max-width: 480px) 276px, 276px"
          className="block h-auto w-full max-w-[276px] object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center gap-2.5 ${className}`.trim()}
      aria-label="シェアヒマ"
    >
      <Image
        src={HEADER_ICON.src}
        alt=""
        width={HEADER_ICON.width}
        height={HEADER_ICON.height}
        sizes="32px"
        className="h-7 w-auto object-contain"
      />
      <Image
        src={HEADER_WORDMARK.src}
        alt=""
        width={HEADER_WORDMARK.width}
        height={HEADER_WORDMARK.height}
        sizes="112px"
        className="h-[22px] w-auto object-contain"
      />
    </div>
  );
}
