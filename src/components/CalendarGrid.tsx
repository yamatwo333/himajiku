"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { AvailabilityWithUser } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

interface Props {
  availabilities: AvailabilityWithUser[];
  onMonthChange: (month: Date) => void;
  groupId?: string;
  notifyThreshold?: number;
  currentUserId?: string | null;
  initialMonth?: Date;
}

export default function CalendarGrid({ availabilities, onMonthChange, groupId, notifyThreshold = 2, currentUserId = null, initialMonth }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth ?? new Date());
  const router = useRouter();

  const now = new Date();
  const minMonth = startOfMonth(subMonths(now, 1));
  const maxMonth = startOfMonth(addMonths(now, 2));
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;

  // 選択可能な月リスト（前月〜2ヶ月後）
  const monthOptions = useMemo(() => {
    const months: Date[] = [];
    for (let i = -1; i <= 2; i++) {
      months.push(addMonths(startOfMonth(now), i));
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMonth = (direction: number) => {
    const next = direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    if (direction < 0 && !canGoPrev) return;
    if (direction > 0 && !canGoNext) return;
    setCurrentMonth(next);
    onMonthChange(next);
  };

  const jumpToMonth = (value: string) => {
    const picked = new Date(value + "-01");
    setCurrentMonth(picked);
    onMonthChange(picked);
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const availByDate = useMemo(() => {
    const map: Record<string, AvailabilityWithUser[]> = {};
    for (const a of availabilities) {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    }
    return map;
  }, [availabilities]);

  return (
    <div className="px-4">
      {/* Month header */}
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
            value={format(currentMonth, "yyyy-MM")}
            onChange={(e) => jumpToMonth(e.target.value)}
            className="appearance-none rounded-xl border px-4 py-1.5 pr-8 text-center text-base font-bold outline-none"
            style={{ color: "var(--color-text)", borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            {monthOptions.map((m) => (
              <option key={format(m, "yyyy-MM")} value={format(m, "yyyy-MM")}>
                {format(m, "yyyy年 M月", { locale: ja })}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--color-text-secondary)" }}>&#x25BC;</span>
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

      {/* Weekday header */}
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

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-[2px]">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAvails = availByDate[dateStr] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const selfFree = dayAvails.some(
            (a) => a.userId === currentUserId
          );
          const friendCount = dayAvails.filter(
            (a) => a.userId !== currentUserId
          ).length;
          const totalCount = dayAvails.length;

          return (
            <button
              key={dateStr}
              onClick={() => router.push(`/calendar/${dateStr}${groupId ? `?group=${groupId}` : ""}`)}
              className="relative flex flex-col items-center rounded-lg py-2 transition-colors active:bg-gray-100"
              style={{
                opacity: inMonth ? 1 : 0.3,
              }}
            >
              {/* Date number */}
              {(() => {
                const isHot = totalCount >= notifyThreshold;
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

              {/* Availability indicators */}
              <div className="mt-1 flex items-center gap-[3px]">
                {selfFree && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--color-free-self)" }}
                  />
                )}
                {friendCount > 0 && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--color-free-friend)" }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-free-self)" }} />
          自分がヒマ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-free-friend)" }} />
          友達がヒマ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-hot)" }} />
          集まったっていい
        </span>
      </div>
    </div>
  );
}
