"use client";

import { useState } from "react";

interface CharacterStickerProps {
  src: string;
  alt: string;
  className?: string;
}

export default function CharacterSticker({
  src,
  alt,
  className = "",
}: CharacterStickerProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHidden(true)}
      className={className}
    />
  );
}
