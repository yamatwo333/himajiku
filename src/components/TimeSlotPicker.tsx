"use client";

import { TIME_SLOTS, TimeSlot, TIME_SLOT_LABELS } from "@/lib/types";

interface Props {
  selected: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export default function TimeSlotPicker({
  selected,
  onChange,
  disabled = false,
  variant = "default",
}: Props) {
  const toggle = (slot: TimeSlot) => {
    if (disabled) return;

    if (selected.includes(slot)) {
      onChange(selected.filter((s) => s !== slot));
    } else {
      onChange([...selected, slot]);
    }
  };

  return (
    <div className={variant === "compact" ? "flex gap-1.5" : "flex gap-2"}>
      {TIME_SLOTS.map((slot) => {
        const isSelected = selected.includes(slot);
        return (
          <button
            key={slot}
            onClick={() => toggle(slot)}
            disabled={disabled}
            className={`flex-1 border font-medium transition-all active:scale-95 ${
              variant === "compact"
                ? "rounded-md py-1.5 text-xs"
                : "rounded-lg px-2 py-2.5 text-sm"
            }`}
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
