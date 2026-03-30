"use client";

import { TimeSlot, TIME_SLOT_LABELS } from "@/lib/types";

interface Props {
  selected: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  disabled?: boolean;
}

const SLOTS: TimeSlot[] = ["morning", "afternoon", "evening", "late_night"];

export default function TimeSlotPicker({ selected, onChange, disabled = false }: Props) {
  const toggle = (slot: TimeSlot) => {
    if (disabled) return;

    if (selected.includes(slot)) {
      onChange(selected.filter((s) => s !== slot));
    } else {
      onChange([...selected, slot]);
    }
  };

  return (
    <div className="flex gap-2">
      {SLOTS.map((slot) => {
        const isSelected = selected.includes(slot);
        return (
          <button
            key={slot}
            onClick={() => toggle(slot)}
            disabled={disabled}
            className="flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-all active:scale-95"
            style={{
              backgroundColor: isSelected ? "var(--color-free-self)" : "var(--color-surface)",
              color: isSelected ? "white" : "var(--color-text)",
              borderColor: isSelected ? "var(--color-free-self)" : "var(--color-border)",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {TIME_SLOT_LABELS[slot]}
          </button>
        );
      })}
    </div>
  );
}
