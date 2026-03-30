"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { TimeSlot, TIME_SLOT_LABELS } from "@/lib/types";

const SLOTS: TimeSlot[] = ["morning", "afternoon", "evening", "late_night"];

interface DayEntry {
  date: string;
  timeSlots: TimeSlot[];
  comment: string;
}

export default function BulkSharePage() {
  const router = useRouter();
  const now = new Date();
  const minMonth = startOfMonth(now);
  const maxMonth = startOfMonth(addMonths(now, 2));
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("calendarMonth");
      if (saved) {
        const parsed = new Date(saved);
        if (parsed < minMonth) return minMonth;
        if (parsed > maxMonth) return maxMonth;
        return parsed;
      }
    }
    return new Date();
  });
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const todayString = getTodayInTokyo();

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

  const toggleSlot = (dateStr: string, slot: TimeSlot) => {
    setEntries(prev => {
      const entry = prev[dateStr] || { date: dateStr, timeSlots: [], comment: "" };
      const newSlots = entry.timeSlots.includes(slot)
        ? entry.timeSlots.filter(s => s !== slot)
        : [...entry.timeSlots, slot];
      return { ...prev, [dateStr]: { ...entry, timeSlots: newSlots } };
    });
  };

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

  const handleSave = async () => {
    if (entriesToSave.length === 0) return;
    setSaving(true);

    try {
      await Promise.all(
        entriesToSave.map(entry =>
          fetch("/api/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: entry.date,
              time_slots: entry.timeSlots,
              comment: entry.comment,
            }),
          })
        )
      );
      router.push("/calendar");
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
      router.push("/calendar");
    }
  };

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">ヒマな日をまとめてシェア</h1>
      </header>

      <div className="flex-1 px-4 pt-4 pb-32 space-y-2">
        {/* Month selector */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canGoPrev}
            className="rounded-lg p-2 active:bg-gray-100 disabled:opacity-20"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="12,4 6,10 12,16" /></svg>
          </button>
          <span className="text-sm font-bold">{format(currentMonth, "yyyy年 M月", { locale: ja })}</span>
          <button
            onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={!canGoNext}
            className="rounded-lg p-2 active:bg-gray-100 disabled:opacity-20"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="8,4 14,10 8,16" /></svg>
          </button>
        </div>

        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          当日以降の日付で、各日の時間帯をタップしてヒマを設定してください
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="space-y-2">
            {daysInMonth.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayLabel = format(day, "M/d (E)", { locale: ja });
              const entry = entries[dateStr];
              const hasSlots = entry && entry.timeSlots.length > 0;
              const isPastDate = dateStr < todayString;

              return (
                <div
                  key={dateStr}
                  className="rounded-xl border p-3"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: hasSlots ? "var(--color-free-self)" : "var(--color-border)",
                    opacity: isPastDate ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                      {dayLabel}
                    </span>
                    {hasSlots && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-free-self)", color: "white" }}>
                        シェア中
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    {SLOTS.map(slot => {
                      const isSelected = entry?.timeSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            if (isPastDate) return;
                            toggleSlot(dateStr, slot);
                          }}
                          disabled={isPastDate}
                          className="flex-1 rounded-md border py-1.5 text-xs font-medium transition-all active:scale-95"
                          style={{
                            backgroundColor: isSelected ? "var(--color-free-self)" : "transparent",
                            color: isSelected ? "white" : "var(--color-text-secondary)",
                            borderColor: isSelected ? "var(--color-free-self)" : "var(--color-border)",
                          }}
                        >
                          {TIME_SLOT_LABELS[slot]}
                        </button>
                      );
                    })}
                  </div>
                  {hasSlots && (
                    <input
                      type="text"
                      value={entry?.comment || ""}
                      onChange={(e) => updateComment(dateStr, e.target.value)}
                      placeholder="ひとこと"
                      maxLength={100}
                      disabled={isPastDate}
                      className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)]"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom save button - above BottomNav */}
      <div className="fixed bottom-[57px] left-1/2 w-full max-w-[480px] -translate-x-1/2 px-4 pb-2 pt-2" style={{ backgroundColor: "var(--color-bg)" }}>
        <button
          onClick={handleSave}
          disabled={saving || entriesToSave.length === 0}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97] disabled:opacity-30"
          style={{ backgroundColor: "var(--color-free-self)" }}
        >
          {saving ? "保存中..." : "まとめてシェアする"}
        </button>
      </div>
    </div>
  );
}
