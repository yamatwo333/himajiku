"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import BulkDayCard from "@/components/calendar/BulkDayCard";
import CalendarMonthSwitcher from "@/components/calendar/CalendarMonthSwitcher";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import { createBulkAvailabilityPayloads, type BulkAvailabilityEntry } from "@/lib/availability";
import {
  buildCalendarUrl as buildCalendarUrlForGroup,
  getCalendarMonthBounds,
  persistCalendarMonth,
  readSelectedGroupId,
  readStoredCalendarMonth,
} from "@/lib/calendar";
import { getTodayInTokyo } from "@/lib/date";
import type { TimeSlot } from "@/lib/types";

interface DayEntry {
  date: string;
  timeSlots: TimeSlot[];
  comment: string;
}

interface BulkShareClientProps {
  initialEntries: Record<string, DayEntry>;
  initialMonthIso: string;
}

export default function BulkShareClient({
  initialEntries,
  initialMonthIso,
}: BulkShareClientProps) {
  const router = useRouter();
  const baseDate = useMemo(() => new Date(initialMonthIso), [initialMonthIso]);
  const initialMonth = useMemo(() => new Date(initialMonthIso), [initialMonthIso]);
  const { minMonth, maxMonth } = useMemo(
    () => getCalendarMonthBounds(baseDate),
    [baseDate]
  );
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [entries, setEntries] = useState<Record<string, DayEntry>>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const restoredStateRef = useRef(false);
  const fetchedOnceRef = useRef(false);
  const pendingInitialMonthRef = useRef<number | null>(null);
  const loadedMonthsRef = useRef(new Set([format(initialMonth, "yyyy-MM")]));
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const todayString = getTodayInTokyo();
  const monthKey = useMemo(() => format(currentMonth, "yyyy-MM"), [currentMonth]);

  const getCalendarUrl = useCallback(() => {
    return buildCalendarUrlForGroup(readSelectedGroupId(), readStoredCalendarMonth());
  }, []);

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const fetchExisting = useCallback(async () => {
    if (loadedMonthsRef.current.has(monthKey)) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const res = await fetch(`/api/availability/month?start=${monthStart}&end=${monthEnd}`);

      if (res.ok) {
        const data = await res.json();
        const currentUserId = data.currentUserId;
        const existing: Record<string, DayEntry> = {};

        for (const availability of data.availabilities || []) {
          if (availability.userId === currentUserId) {
            existing[availability.date] = {
              date: availability.date,
              timeSlots: availability.timeSlots || [],
              comment: availability.comment || "",
            };
          }
        }

        setEntries((prev) => {
          const merged = { ...existing };

          for (const [key, value] of Object.entries(prev)) {
            if (key.startsWith(format(currentMonth, "yyyy-MM"))) {
              merged[key] = value;
            }
          }

          return merged;
        });
        loadedMonthsRef.current.add(monthKey);
      }
    } catch {
      // ignore
    }

    setLoading(false);
  }, [currentMonth, monthKey]);

  useEffect(() => {
    const savedMonth = readStoredCalendarMonth(baseDate);

    if (savedMonth.getTime() !== initialMonth.getTime()) {
      setLoading(true);
      setCurrentMonth(savedMonth);
      restoredStateRef.current = true;
      persistCalendarMonth(savedMonth);
      pendingInitialMonthRef.current = savedMonth.getTime();
    } else {
      persistCalendarMonth(initialMonth);
      pendingInitialMonthRef.current = initialMonth.getTime();
    }

    initializedRef.current = true;
  }, [baseDate, initialMonth]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    if (pendingInitialMonthRef.current !== null) {
      if (pendingInitialMonthRef.current !== currentMonth.getTime()) {
        return;
      }

      pendingInitialMonthRef.current = null;

      if (!restoredStateRef.current) {
        fetchedOnceRef.current = true;
        return;
      }
    }

    fetchedOnceRef.current = true;

    fetchExisting();
  }, [currentMonth, fetchExisting]);

  const updateComment = (dateStr: string, comment: string) => {
    setEntries((prev) => {
      const entry = prev[dateStr] || { date: dateStr, timeSlots: [], comment: "" };
      return { ...prev, [dateStr]: { ...entry, comment } };
    });
  };

  const entriesToSave = useMemo(() => {
    return Object.values(entries).filter(
      (entry) =>
        entry.date >= todayString &&
        entry.timeSlots.length > 0 &&
        daysInMonth.some((day) => format(day, "yyyy-MM-dd") === entry.date)
    );
  }, [daysInMonth, entries, todayString]);

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

      if (!responses.every((response) => response.ok)) {
        setSaving(false);
        return;
      }

      router.push(getCalendarUrl());
      return;
    } catch {
      // ignore
    }

    setSaving(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(getCalendarUrl());
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="ヒマな日をまとめてシェア" onBack={handleBack} />

      <div className="flex-1 space-y-2 px-4 pt-4 pb-32">
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
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          ※ 未定はヒマ人数・赤丸・LINE通知には含まれません
        </p>

        {loading ? (
          <PageSpinner className="flex items-center justify-center py-16" />
        ) : (
          <div className="space-y-2">
            {daysInMonth.map((day) => {
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

      <div
        className="fixed bottom-[57px] left-1/2 w-full max-w-[480px] -translate-x-1/2 px-4 pb-2 pt-2"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
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
