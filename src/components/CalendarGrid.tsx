"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { getTodayInTokyo } from "@/lib/date";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  AvailabilityWithUser,
  FREE_TIME_SLOTS,
  hasFreeTimeSlots,
  isUndecidedOnly,
  type FreeTimeSlot,
} from "@/lib/types";
import { useMonthSwipePreview } from "@/components/calendar/useMonthSwipePreview";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function createSlotCounts(): Record<FreeTimeSlot, number> {
  return FREE_TIME_SLOTS.reduce((counts, slot) => {
    counts[slot] = 0;
    return counts;
  }, {} as Record<FreeTimeSlot, number>);
}

interface Props {
  availabilities: AvailabilityWithUser[];
  onMonthChange: (month: Date) => void;
  groupId?: string;
  notifyThreshold?: number;
  currentUserId?: string | null;
  initialMonth?: Date;
}

export default function CalendarGrid({
  availabilities,
  onMonthChange,
  groupId,
  notifyThreshold = 2,
  currentUserId = null,
  initialMonth,
}: Props) {
  const baseMonth = useMemo(() => startOfMonth(new Date()), []);
  const minMonth = baseMonth;
  const maxMonth = useMemo(() => addMonths(baseMonth, 2), [baseMonth]);
  const currentMonth = useMemo(() => {
    const month = startOfMonth(initialMonth ?? baseMonth);
    if (month < minMonth) return minMonth;
    if (month > maxMonth) return maxMonth;
    return month;
  }, [baseMonth, initialMonth, maxMonth, minMonth]);
  const router = useRouter();
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const todayString = getTodayInTokyo();

  const monthOptions = useMemo(() => {
    return Array.from({ length: 3 }, (_, index) => addMonths(baseMonth, index));
  }, [baseMonth]);

  const changeMonth = (direction: number) => {
    const next = direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    if (direction < 0 && !canGoPrev) return;
    if (direction > 0 && !canGoNext) return;
    onMonthChange(next);
  };

  const jumpToMonth = (value: string) => {
    const picked = new Date(value + "-01");
    onMonthChange(picked);
  };

  const { surfaceProps, contentStyle } = useMonthSwipePreview({
    canGoPrev,
    canGoNext,
    onSwipePrev: () => changeMonth(-1),
    onSwipeNext: () => changeMonth(1),
  });

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const daySummaryByDate = useMemo(() => {
    const map: Record<
      string,
      {
        selfFree: boolean;
        friendFree: boolean;
        hasUndecided: boolean;
        isHot: boolean;
        slotCounts: Record<FreeTimeSlot, number>;
      }
    > = {};

    for (const availability of availabilities) {
      const summary =
        map[availability.date] ??
        {
          selfFree: false,
          friendFree: false,
          hasUndecided: false,
          isHot: false,
          slotCounts: createSlotCounts(),
        };

      const free = hasFreeTimeSlots(availability.timeSlots);
      const undecided = isUndecidedOnly(availability.timeSlots);

      if (availability.userId === currentUserId && free) {
        summary.selfFree = true;
      } else if (availability.userId !== currentUserId && free) {
        summary.friendFree = true;
      }

      if (undecided) {
        summary.hasUndecided = true;
      }

      for (const slot of availability.timeSlots.filter((timeSlot): timeSlot is FreeTimeSlot =>
        FREE_TIME_SLOTS.includes(timeSlot as FreeTimeSlot)
      )) {
        summary.slotCounts[slot] += 1;
      }

      summary.isHot = FREE_TIME_SLOTS.some(
        (slot) => summary.slotCounts[slot] >= notifyThreshold
      );

      map[availability.date] = summary;
    }

    return map;
  }, [availabilities, currentUserId, notifyThreshold]);

  return (
    <div className="px-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          disabled={!canGoPrev}
          className="rounded-lg p-3 active:bg-gray-100 disabled:opacity-20"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="12,4 6,10 12,16" />
          </svg>
        </button>
        <div className="relative">
          <select
            data-testid="calendar-month-select"
            value={format(currentMonth, "yyyy-MM")}
            onChange={(e) => jumpToMonth(e.target.value)}
            className="appearance-none rounded-xl border px-4 py-1.5 pr-8 text-center text-base font-bold outline-none"
            style={{
              color: "var(--color-text)",
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            {monthOptions.map((m) => (
              <option key={format(m, "yyyy-MM")} value={format(m, "yyyy-MM")}>
                {format(m, "yyyy年 M月", { locale: ja })}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            &#x25BC;
          </span>
        </div>
        <button
          onClick={() => changeMonth(1)}
          disabled={!canGoNext}
          className="rounded-lg p-3 active:bg-gray-100 disabled:opacity-20"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="8,4 14,10 8,16" />
          </svg>
        </button>
      </div>

      <div
        data-testid="calendar-swipe-surface"
        className="select-none"
        {...surfaceProps}
      >
        <div className="grid grid-cols-7 gap-[2px]">
          <div className="col-span-7" style={contentStyle}>
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className="py-1"
                  style={{
                    color: i === 0 ? "var(--color-hot)" : i === 6 ? "var(--color-primary)" : undefined,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-[2px]">
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const daySummary = daySummaryByDate[dateStr];
                const inMonth = isSameMonth(day, currentMonth);
                const isPast = dateStr < todayString;
                const selfFree = daySummary?.selfFree ?? false;
                const friendFree = daySummary?.friendFree ?? false;
                const hasUndecided = daySummary?.hasUndecided ?? false;
                const isHot = daySummary?.isHot ?? false;

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (isPast) return;
                      router.push(`/calendar/${dateStr}${groupId ? `?group=${groupId}` : ""}`);
                    }}
                    disabled={isPast}
                    className="relative flex flex-col items-center rounded-lg py-2 transition-colors active:bg-gray-100"
                    style={{
                      opacity: inMonth ? (isPast ? 0.35 : 1) : isPast ? 0.15 : 0.3,
                    }}
                  >
                    {(() => {
                      const today = isToday(day);
                      return (
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                          style={{
                            backgroundColor: today ? "var(--color-today)" : isHot ? "var(--color-hot)" : "transparent",
                            color: today || isHot ? "white" : undefined,
                            fontWeight: today || isHot ? 700 : 400,
                          }}
                        >
                          {format(day, "d")}
                        </span>
                      );
                    })()}

                    <div className="mt-1 flex items-center gap-[3px]">
                      {selfFree && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "var(--color-free-self)" }}
                        />
                      )}
                      {friendFree && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "var(--color-free-friend)" }}
                        />
                      )}
                      {hasUndecided && (
                        <div
                          className="h-2 w-2 rounded-full border"
                          style={{
                            borderColor: "var(--color-text-secondary)",
                            backgroundColor: "transparent",
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="mx-auto mt-4 grid max-w-[320px] grid-cols-2 gap-x-4 gap-y-2 text-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-free-self)" }}
          />
          自分がヒマ
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-free-friend)" }}
          />
          友だちがヒマ
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full border"
            style={{
              borderColor: "var(--color-text-secondary)",
              backgroundColor: "transparent",
            }}
          />
          未定あり
        </span>
        <span className="flex items-center gap-1">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--color-hot)" }}
          >
            !
          </span>
          集まれそう
        </span>
      </div>
    </div>
  );
}
