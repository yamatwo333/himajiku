import { TIME_SLOTS, type TimeSlot } from "@/lib/types";

export interface BulkAvailabilityEntry {
  date: string;
  timeSlots: TimeSlot[];
  comment: string;
}

interface BulkAvailabilityPayload {
  dates: string[];
  time_slots: TimeSlot[];
  comment: string;
}

export function createBulkAvailabilityPayloads(
  entries: BulkAvailabilityEntry[]
): BulkAvailabilityPayload[] {
  const batches = new Map<string, BulkAvailabilityPayload>();
  const slotIndex = new Map(TIME_SLOTS.map((slot, index) => [slot, index]));

  for (const entry of entries) {
    const normalizedSlots = [...entry.timeSlots].sort(
      (left, right) => (slotIndex.get(left) ?? 0) - (slotIndex.get(right) ?? 0)
    ) as TimeSlot[];
    const key = `${normalizedSlots.join(",")}::${entry.comment}`;
    const existing = batches.get(key);

    if (existing) {
      existing.dates.push(entry.date);
      continue;
    }

    batches.set(key, {
      dates: [entry.date],
      time_slots: normalizedSlots,
      comment: entry.comment,
    });
  }

  return [...batches.values()].map((batch) => ({
    ...batch,
    dates: [...batch.dates].sort(),
  }));
}
