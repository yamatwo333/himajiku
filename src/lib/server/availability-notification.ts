const ORDERED_NOTIFICATION_SLOTS = [
  "morning",
  "afternoon",
  "evening",
  "late_night",
] as const;

type NotificationSlot = (typeof ORDERED_NOTIFICATION_SLOTS)[number];

export function getNewlyMatchingTimeSlots({
  previousMatchingSlots,
  currentMatchingSlots,
}: {
  previousMatchingSlots: readonly string[];
  currentMatchingSlots: readonly NotificationSlot[];
}) {
  const previousMatches = new Set(
    previousMatchingSlots.filter((slot): slot is NotificationSlot =>
      ORDERED_NOTIFICATION_SLOTS.includes(slot as NotificationSlot)
    )
  );

  return ORDERED_NOTIFICATION_SLOTS.filter(
    (slot) => currentMatchingSlots.includes(slot) && !previousMatches.has(slot)
  );
}
