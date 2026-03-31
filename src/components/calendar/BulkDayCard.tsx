import TimeSlotPicker from "@/components/TimeSlotPicker";
import type { TimeSlot } from "@/lib/types";

interface BulkDayCardProps {
  dayLabel: string;
  selectedSlots: TimeSlot[];
  comment: string;
  isPastDate: boolean;
  onSlotsChange: (slots: TimeSlot[]) => void;
  onCommentChange: (comment: string) => void;
}

export default function BulkDayCard({
  dayLabel,
  selectedSlots,
  comment,
  isPastDate,
  onSlotsChange,
  onCommentChange,
}: BulkDayCardProps) {
  const hasSlots = selectedSlots.length > 0;

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: hasSlots ? "var(--color-free-self)" : "var(--color-border)",
        opacity: isPastDate ? 0.5 : 1,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          {dayLabel}
        </span>
        {hasSlots ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "var(--color-free-self)", color: "white" }}
          >
            シェア中
          </span>
        ) : null}
      </div>

      <TimeSlotPicker
        selected={selectedSlots}
        onChange={onSlotsChange}
        disabled={isPastDate}
        variant="compact"
      />

      {hasSlots ? (
        <input
          type="text"
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder="ひとこと"
          maxLength={100}
          disabled={isPastDate}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)]"
          style={{ borderColor: "var(--color-border)" }}
        />
      ) : null}
    </div>
  );
}
