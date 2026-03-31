"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import BulkDayCard from "@/components/calendar/BulkDayCard";
import CalendarMonthSwitcher from "@/components/calendar/CalendarMonthSwitcher";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import { getTodayInTokyo } from "@/lib/date";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { createBulkAvailabilityPayloads, type BulkAvailabilityEntry } from "@/lib/availability";
import {
  buildCalendarUrl as buildCalendarUrlForGroup,
  getCalendarMonthBounds,
  persistCalendarMonth,
  readSelectedGroupId,
  readStoredCalendarMonth,
} from "@/lib/calendar";
import { TimeSlot } from "@/lib/types";

interface DayEntry {
  date: string;
  timeSlots: TimeSlot[];
  comment: string;
}

export default function BulkSharePage() {
  const router = useRouter();
  const baseDate = useMemo(() => new Date(), []);
  const { minMonth, maxMonth } = useMemo(
    () => getCalendarMonthBounds(baseDate),
    [baseDate]
  );
  const [currentMonth, setCurrentMonth] = useState(() => readStoredCalendarMonth(baseDate));
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const todayString = getTodayInTokyo();

  const getCalendarUrl = useCallback(() => {
    return buildCalendarUrlForGroup(readSelectedGroupId());
  }, []);

  // 当月の全日付
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // 既存データを取得
  const fetchExisting = useCallback(async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const res = await fetch(`/api/availability/month?start=${monthStart}&end=${monthEnd}`);
      if (res.ok) {
        const data = await res.json();
        const currentUserId = data.currentUserId;
        const existing: Record<string, DayEntry> = {};
        for (const a of data.availabilities || []) {
          if (a.userId === currentUserId) {
            existing[a.date] = {
              date: a.date,
              timeSlots: a.timeSlots || [],
              comment: a.comment || "",
            };
          }
        }
        setEntries(prev => {
          const merged = { ...existing };
          for (const [key, val] of Object.entries(prev)) {
            if (key.startsWith(format(currentMonth, "yyyy-MM"))) {
              merged[key] = val;
            }
          }
          return merged;
        });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const updateComment = (dateStr: string, comment: string) => {
    setEntries(prev => {
      const entry = prev[dateStr] || { date: dateStr, timeSlots: [], comment: "" };
      return { ...prev, [dateStr]: { ...entry, comment } };
    });
  };

  const entriesToSave = useMemo(() => {
    return Object.values(entries).filter(e =>
      e.date >= todayString &&
      e.timeSlots.length > 0 &&
      daysInMonth.some(d => format(d, "yyyy-MM-dd") === e.date)
    );
  }, [entries, daysInMonth, todayString]);

  const savePayloads = useMemo(
    () => createBulkAvailabilityPayloads(entriesToSave as BulkAvailabilityEntry[]),
    [entriesToSave]
  );

  const handleSave = async () => {
    if (savePayloads.length === 0) return;
    setSaving(true);

    try {
      const responses = await Promise.all(
        savePayloads.map((payload) =>
          fetch("/api/availability/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dates: payload.dates,
              time_slots: payload.time_slots,
              comment: payload.comment,
            }),
          })
        )
      );
      const allSucceeded = responses.every((response) => response.ok);
      if (!allSucceeded) {
        setSaving(false);
        return;
      }
      router.push(getCalendarUrl());
      router.refresh();
      return;
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(getCalendarUrl());
    }
  };

  return (
    <div className="flex flex-col min-h-dvh">
      <PageHeader title="ヒマな日をまとめてシェア" onBack={handleBack} />

      <div className="flex-1 px-4 pt-4 pb-32 space-y-2">
        <CalendarMonthSwitcher
          currentMonth={currentMonth}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={() => {
            const nextMonth = subMonths(currentMonth, 1);
            setCurrentMonth(nextMonth);
            persistCalendarMonth(nextMonth);
          }}
          onNext={() => {
            const nextMonth = addMonths(currentMonth, 1);
            setCurrentMonth(nextMonth);
            persistCalendarMonth(nextMonth);
          }}
        />

        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          当日以降の日付で、各日の時間帯をタップしてヒマを設定してください
        </p>

        {loading ? (
          <PageSpinner className="flex items-center justify-center py-16" />
        ) : (
          <div className="space-y-2">
            {daysInMonth.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayLabel = format(day, "M/d (E)", { locale: ja });
              const entry = entries[dateStr];
              const isPastDate = dateStr < todayString;

              return (
                <BulkDayCard
                  key={dateStr}
                  dayLabel={dayLabel}
                  selectedSlots={entry?.timeSlots ?? []}
                  comment={entry?.comment ?? ""}
                  isPastDate={isPastDate}
                  onSlotsChange={(slots) => {
                    if (isPastDate) return;
                    setEntries((prev) => ({
                      ...prev,
                      [dateStr]: {
                        date: dateStr,
                        timeSlots: slots,
                        comment: prev[dateStr]?.comment ?? "",
                      },
                    }));
                  }}
                  onCommentChange={(nextComment) => updateComment(dateStr, nextComment)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom save button - above BottomNav */}
      <div className="fixed bottom-[57px] left-1/2 w-full max-w-[480px] -translate-x-1/2 px-4 pb-2 pt-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <button
          onClick={handleSave}
          disabled={saving || savePayloads.length === 0}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97] disabled:opacity-30"
          style={{ backgroundColor: "var(--color-free-self)" }}
        >
          {saving ? "保存中..." : "まとめてシェアする"}
        </button>
      </div>
    </div>
  );
}
