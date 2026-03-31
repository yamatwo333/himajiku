export type TimeSlot = "morning" | "afternoon" | "evening" | "late_night";

export const TIME_SLOTS: TimeSlot[] = [
  "morning",
  "afternoon",
  "evening",
  "late_night",
];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "午前",
  afternoon: "午後",
  evening: "夜",
  late_night: "夜中",
};

export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string;
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
