import ProfileAvatar from "@/components/ProfileAvatar";

interface ProfileSummaryCardProps {
  displayName: string;
  avatarUrl: string | null;
}

export default function ProfileSummaryCard({
  displayName,
  avatarUrl,
}: ProfileSummaryCardProps) {
  return (
    <section className="flex items-center gap-4">
      <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
      <div>
        <p className="text-lg font-bold">{displayName}</p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          LINE連携済み
        </p>
      </div>
    </section>
  );
}
