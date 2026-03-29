"use client";

import { useState, useEffect, useMemo } from "react";
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
import { createClient } from "@/lib/supabase/client";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

interface Props {
  availabilities: AvailabilityWithUser[];
  onMonthChange: (month: Date) => void;
  groupId?: string;
}

export default function CalendarGrid({ availabilities, onMonthChange, groupId }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const changeMonth = (next: Date) => {
    setCurrentMonth(next);
    onMonthChange(next);
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
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
          onClick={() => changeMonth(subMonths(currentMonth, 1))}
          className="rounded-lg p-2 active:bg-gray-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="12,4 6,10 12,16" />
          </svg>
        </button>
        <h2 className="text-lg font-bold">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h2>
        <button
          onClick={() => changeMonth(addMonths(currentMonth, 1))}
          className="rounded-lg p-2 active:bg-gray-100"
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
              color: i === 5 ? "var(--color-primary)" : i === 6 ? "var(--color-hot)" : undefined,
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
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{
                  backgroundColor: isToday(day)
                    ? "var(--color-today)"
                    : "transparent",
                  color: isToday(day) ? "white" : undefined,
                  fontWeight: isToday(day) ? 700 : 400,
                }}
              >
                {format(day, "d")}
              </span>

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
                    style={{
                      backgroundColor:
                        totalCount >= 2
                          ? "var(--color-hot)"
                          : "var(--color-free-friend)",
                    }}
                  />
                )}
              </div>

              {/* Hot badge for 2+ */}
              {totalCount >= 2 && inMonth && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-hot)" }}
                >
                  {totalCount}
                </span>
              )}
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
          2人以上
        </span>
      </div>
    </div>
  );
}
