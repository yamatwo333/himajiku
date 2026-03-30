import Image from "next/image";

interface BrandLogoProps {
  variant?: "wordmark" | "lockup";
  className?: string;
}

export default function BrandLogo({
  variant = "wordmark",
  className = "",
}: BrandLogoProps) {
  const isLockup = variant === "lockup";
  const src = isLockup ? "/brand/lockup.png" : "/brand/wordmark.png";
  const width = isLockup ? 980 : 620;
  const height = isLockup ? 260 : 220;
  const imageClassName = isLockup
    ? "h-auto w-full max-w-[300px] object-contain"
    : "h-auto w-full max-w-[165px] object-contain";

  if (variant === "lockup") {
    return (
      <div className={`inline-flex w-full justify-center ${className}`.trim()}>
        <Image
          src={src}
          alt="シェアヒマ"
          width={width}
          height={height}
          priority
          sizes="(max-width: 480px) 300px, 300px"
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex w-full justify-center ${className}`.trim()}>
      <Image
        src={src}
        alt="シェアヒマ"
        width={width}
        height={height}
        sizes="165px"
        className={imageClassName}
      />
    </div>
  );
}
