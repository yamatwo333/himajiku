"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import BulkDayCard from "@/components/calendar/BulkDayCard";
import CalendarMonthSwitcher from "@/components/calendar/CalendarMonthSwitcher";
import { useMonthSwipePreview } from "@/components/calendar/useMonthSwipePreview";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import {
  createBulkAvailabilitySyncRequest,
  type BulkAvailabilityEntry,
} from "@/lib/availability";
import { markCalendarFlash } from "@/lib/flash";
import { scheduleIdleTask } from "@/lib/idle";
import {
  buildCalendarUrl as buildCalendarUrlForGroup,
  getCalendarMonthBounds,
  markCalendarDataStale,
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
  const pendingInitialMonthRef = useRef<number | null>(null);
  const loadedMonthsRef = useRef(new Set([format(initialMonth, "yyyy-MM")]));
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const todayString = getTodayInTokyo();
  const monthKey = useMemo(() => format(currentMonth, "yyyy-MM"), [currentMonth]);
  const monthStartString = useMemo(
    () => format(startOfMonth(currentMonth), "yyyy-MM-dd"),
    [currentMonth]
  );
  const monthEndString = useMemo(
    () => format(endOfMonth(currentMonth), "yyyy-MM-dd"),
    [currentMonth]
  );
  const syncStart = monthStartString < todayString ? todayString : monthStartString;

  const getCalendarUrl = useCallback(() => {
    return buildCalendarUrlForGroup(readSelectedGroupId(), readStoredCalendarMonth());
  }, []);

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
      (day) => format(day, "yyyy-MM-dd") >= todayString
    );
  }, [currentMonth, todayString]);

  const goToPrevMonth = useCallback(() => {
    const nextMonth = subMonths(currentMonth, 1);
    if (!loadedMonthsRef.current.has(format(nextMonth, "yyyy-MM"))) {
      setLoading(true);
    }
    setCurrentMonth(nextMonth);
    persistCalendarMonth(nextMonth);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    const nextMonth = addMonths(currentMonth, 1);
    if (!loadedMonthsRef.current.has(format(nextMonth, "yyyy-MM"))) {
      setLoading(true);
    }
    setCurrentMonth(nextMonth);
    persistCalendarMonth(nextMonth);
  }, [currentMonth]);

  const {
    surfaceProps,
    contentStyle,
    dragOffsetX,
    isDragging,
    peekRatio,
    peekDirection,
  } = useMonthSwipePreview({
    canGoPrev,
    canGoNext,
    onSwipePrev: goToPrevMonth,
    onSwipeNext: goToNextMonth,
  });
  const showPrevPeek = canGoPrev && peekDirection === "prev";
  const showNextPeek = canGoNext && peekDirection === "next";
  const monthCardShadow = isDragging
    ? `0 18px 38px rgba(15, 23, 42, ${0.08 + peekRatio * 0.1})`
    : "0 10px 24px rgba(15, 23, 42, 0.06)";

  const fetchExisting = useCallback(async () => {
    if (loadedMonthsRef.current.has(monthKey)) {
      setLoading(false);
      return;
    }

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
          const merged = { ...prev };

          for (const [key, value] of Object.entries(existing)) {
            if (!(key in merged)) {
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
      startTransition(() => {
        setLoading(true);
        setCurrentMonth(savedMonth);
      });
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
        return;
      }
    }

    const timeoutId = window.setTimeout(() => {
      void fetchExisting();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentMonth, fetchExisting]);

  useEffect(() => {
    const task = scheduleIdleTask(() => {
      router.prefetch(getCalendarUrl());
    }, 500);

    return () => {
      task.cancel();
    };
  }, [getCalendarUrl, router]);

  const updateComment = (dateStr: string, comment: string) => {
    setEntries((prev) => {
      const entry = prev[dateStr] || { date: dateStr, timeSlots: [], comment: "" };
      return { ...prev, [dateStr]: { ...entry, comment } };
    });
  };

  const entriesInScope = useMemo(() => {
    return Object.values(entries).filter(
      (entry) => entry.date >= syncStart && entry.date <= monthEndString
    );
  }, [entries, monthEndString, syncStart]);

  const entriesToSave = useMemo(() => {
    return entriesInScope.filter((entry) => entry.timeSlots.length > 0);
  }, [entriesInScope]);

  const saveRequest = useMemo(
    () =>
      createBulkAvailabilitySyncRequest({
        start: syncStart,
        end: monthEndString,
        entries: entriesToSave as BulkAvailabilityEntry[],
      }),
    [entriesToSave, monthEndString, syncStart]
  );

  const handleSave = async () => {
    if (entriesInScope.length === 0) return;
    setSaving(true);

    try {
      const response = await fetch("/api/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveRequest),
      });

      if (!response.ok) {
        setSaving(false);
        return;
      }

      markCalendarDataStale();
      markCalendarFlash("saved");
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

      <div className="flex-1 px-4 pt-5 pb-32">
        <div
          data-testid="bulk-swipe-surface"
          className="relative overflow-hidden rounded-[26px]"
          {...surfaceProps}
        >
          <div
            className="pointer-events-none absolute inset-y-2 left-0 w-[88%] rounded-[24px] border"
            style={{
              opacity: showPrevPeek ? 0.18 + peekRatio * 0.32 : 0,
              transform: `translate3d(${Math.max(-16, dragOffsetX * 0.16 - 16)}px, 0, 0)`,
              transition: isDragging ? "none" : "opacity 180ms ease, transform 220ms ease",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.58) 100%)",
              borderColor: "rgba(148, 163, 184, 0.18)",
              boxShadow: "inset -18px 0 28px rgba(148, 163, 184, 0.12)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-2 right-0 w-[88%] rounded-[24px] border"
            style={{
              opacity: showNextPeek ? 0.18 + peekRatio * 0.32 : 0,
              transform: `translate3d(${Math.min(16, dragOffsetX * 0.16 + 16)}px, 0, 0)`,
              transition: isDragging ? "none" : "opacity 180ms ease, transform 220ms ease",
              background:
                "linear-gradient(270deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.58) 100%)",
              borderColor: "rgba(148, 163, 184, 0.18)",
              boxShadow: "inset 18px 0 28px rgba(148, 163, 184, 0.12)",
            }}
          />
          <div
            className="rounded-[24px] border px-4 py-3"
            style={{
              ...contentStyle,
              backgroundColor: "var(--color-surface)",
              borderColor: "rgba(148, 163, 184, 0.18)",
              boxShadow: monthCardShadow,
            }}
          >
            <CalendarMonthSwitcher
              currentMonth={currentMonth}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
              labelTestId="bulk-month-label"
            />

            <div className="space-y-1">
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                当日以降の日付で、各日の時間帯をタップしてヒマを設定してください
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                ※ 未定はヒマ人数・赤丸・LINE通知には含まれません
              </p>
            </div>

            {loading ? (
              <PageSpinner className="flex items-center justify-center py-16" />
            ) : (
              <div className="mt-4 space-y-2">
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
        </div>
      </div>

      <div
        className="fixed bottom-[57px] left-1/2 w-full max-w-[480px] -translate-x-1/2 px-4 pb-2 pt-2"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <button
          onClick={handleSave}
          disabled={saving || entriesInScope.length === 0}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97] disabled:opacity-30"
          style={{ backgroundColor: "var(--color-free-self)" }}
        >
          {saving ? "保存中..." : "まとめてシェアする"}
        </button>
      </div>
    </div>
  );
}
