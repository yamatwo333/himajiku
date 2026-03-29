import { AvailabilityWithUser, TIME_SLOT_LABELS } from "@/lib/types";

interface Props {
  availabilities: AvailabilityWithUser[];
  currentUserId: string;
}

export default function FriendAvailabilityList({
  availabilities,
  currentUserId,
}: Props) {
  const friends = availabilities.filter((a) => a.userId !== currentUserId);

  if (friends.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        この日はまだ誰もヒマを登録していません
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border p-3"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{a.user.displayName}</span>
            <div className="flex gap-1">
              {a.timeSlots.map((slot) => (
                <span
                  key={slot}
                  className="rounded-md px-2 py-0.5 text-xs text-white"
                  style={{ backgroundColor: "var(--color-free-friend)" }}
                >
                  {TIME_SLOT_LABELS[slot]}
                </span>
              ))}
            </div>
          </div>
          {a.comment && (
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {a.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
