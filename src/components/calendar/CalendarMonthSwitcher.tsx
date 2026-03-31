import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface CalendarMonthSwitcherProps {
  currentMonth: Date;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function CalendarMonthSwitcher({
  currentMonth,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: CalendarMonthSwitcherProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="rounded-lg p-2 active:bg-gray-100 disabled:opacity-20"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <polyline points="12,4 6,10 12,16" />
        </svg>
      </button>
      <span className="text-sm font-bold">
        {format(currentMonth, "yyyy年 M月", { locale: ja })}
      </span>
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="rounded-lg p-2 active:bg-gray-100 disabled:opacity-20"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <polyline points="8,4 14,10 8,16" />
        </svg>
      </button>
    </div>
  );
}
