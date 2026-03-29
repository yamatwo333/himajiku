"use client";

import { TimeSlot, TIME_SLOT_LABELS } from "@/lib/types";

interface Props {
  selected: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}

const SLOTS: TimeSlot[] = ["all_day", "morning", "afternoon", "evening"];

export default function TimeSlotPicker({ selected, onChange }: Props) {
  const toggle = (slot: TimeSlot) => {
    if (slot === "all_day") {
      // Toggle all_day: if selected, deselect; if not, select only all_day
      if (selected.includes("all_day")) {
        onChange([]);
      } else {
        onChange(["all_day"]);
      }
      return;
    }

    // If all_day is selected and user picks a specific slot, switch to that slot
    let next = selected.filter((s) => s !== "all_day");
    if (next.includes(slot)) {
      next = next.filter((s) => s !== slot);
    } else {
      next = [...next, slot];
    }
    // If all three specific slots are selected, switch to all_day
    if (
      next.includes("morning") &&
      next.includes("afternoon") &&
      next.includes("evening")
    ) {
      onChange(["all_day"]);
    } else {
      onChange(next);
    }
  };

  const isActive = (slot: TimeSlot) => {
    if (slot === "all_day") return selected.includes("all_day");
    return selected.includes(slot) || selected.includes("all_day");
  };

  return (
    <div className="flex gap-2">
      {SLOTS.map((slot) => (
        <button
          key={slot}
          onClick={() => toggle(slot)}
          className="flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-all active:scale-95"
          style={{
            backgroundColor: isActive(slot)
              ? "var(--color-primary)"
              : "var(--color-surface)",
            color: isActive(slot) ? "white" : "var(--color-text)",
            borderColor: isActive(slot)
              ? "var(--color-primary)"
              : "var(--color-border)",
          }}
        >
          {TIME_SLOT_LABELS[slot]}
        </button>
      ))}
    </div>
  );
}
