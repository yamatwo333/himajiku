import { AvailabilityWithUser, TIME_SLOT_LABELS } from "@/lib/types";

interface Props {
  availabilities: AvailabilityWithUser[];
  currentUserId: string;
}

export default function FriendAvailabilityList({
  availabilities,
  currentUserId,
}: Props) {
  if (availabilities.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        この日はまだ誰もヒマをシェアしていません
      </p>
    );
  }

  const sorted = [...availabilities].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {sorted.map((a) => {
        const isSelf = a.userId === currentUserId;
        return (
          <div
            key={a.id}
            className="rounded-xl border p-3"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: isSelf ? "var(--color-primary)" : "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.user.displayName}</span>
                {isSelf && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                    あなた
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {a.timeSlots.map((slot) => (
                  <span
                    key={slot}
                    className="rounded-md px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                  >
                    {TIME_SLOT_LABELS[slot]}
                  </span>
                ))}
              </div>
            </div>
            {a.comment && (
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {a.comment}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
