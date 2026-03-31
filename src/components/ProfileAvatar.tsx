import Image from "next/image";

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: {
    image: 40,
    className: "h-10 w-10 text-sm",
  },
  md: {
    image: 56,
    className: "h-14 w-14 text-xl",
  },
  lg: {
    image: 72,
    className: "h-[72px] w-[72px] text-2xl",
  },
} as const;

export default function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
}: ProfileAvatarProps) {
  const config = SIZE_MAP[size];

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={config.image}
        height={config.image}
        className={`${config.className} rounded-full object-cover`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${config.className}`}
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {name.charAt(0)}
    </div>
  );
}
