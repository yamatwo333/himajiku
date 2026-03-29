export type TimeSlot = "morning" | "afternoon" | "evening" | "all_day";

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  all_day: "終日",
  morning: "午前",
  afternoon: "午後",
  evening: "夜",
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
