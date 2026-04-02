import { TIME_SLOTS, type TimeSlot } from "@/lib/types";

export interface BulkAvailabilityEntry {
  date: string;
  timeSlots: TimeSlot[];
  comment: string;
}

export interface BulkAvailabilitySyncEntry {
  date: string;
  time_slots: TimeSlot[];
  comment: string;
}

export interface BulkAvailabilitySyncRequest {
  start: string;
  end: string;
  entries: BulkAvailabilitySyncEntry[];
}

export function createBulkAvailabilitySyncRequest({
  start,
  end,
  entries,
}: {
  start: string;
  end: string;
  entries: BulkAvailabilityEntry[];
}): BulkAvailabilitySyncRequest {
  const slotIndex = new Map(TIME_SLOTS.map((slot, index) => [slot, index]));
  const normalizedEntries = entries
    .map((entry) => ({
      date: entry.date,
      time_slots: [...entry.timeSlots].sort(
        (left, right) => (slotIndex.get(left) ?? 0) - (slotIndex.get(right) ?? 0)
      ) as TimeSlot[],
      comment: entry.comment,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    start,
    end,
    entries: normalizedEntries,
  };
}
