export type TimeSlot =
  | "morning"
  | "afternoon"
  | "evening"
  | "late_night"
  | "undecided";

export const TIME_SLOTS: TimeSlot[] = [
  "morning",
  "afternoon",
  "evening",
  "late_night",
  "undecided",
];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "午前",
  afternoon: "午後",
  evening: "夜",
  late_night: "夜中",
  undecided: "未定",
};

export function isTimeSlot(value: unknown): value is TimeSlot {
  return typeof value === "string" && TIME_SLOTS.includes(value as TimeSlot);
}

export function normalizeTimeSlots(value: unknown): TimeSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<TimeSlot>();

  for (const slot of value) {
    if (isTimeSlot(slot)) {
      seen.add(slot);
    }
  }

  return TIME_SLOTS.filter((slot) => seen.has(slot));
}

export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface Availability {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timeSlots: TimeSlot[];
  comment: string;
}

export interface AvailabilityWithUser extends Availability {
  user: User;
}
