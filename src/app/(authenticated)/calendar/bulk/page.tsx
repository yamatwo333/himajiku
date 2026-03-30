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
  isBefore,
} from "date-fns";
import { ja } from "date-fns/locale";
import { TimeSlot, TIME_SLOT_LABELS } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SLOTS: TimeSlot[] = ["morning", "afternoon", "evening", "late_night"];

export default function BulkSharePage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const minMonth = startOfMonth(subMonths(now, 1));
  const maxMonth = startOfMonth(addMonths(now, 2));
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const toggleDate = (dateStr: string) => {
    const next = new Set(selectedDates);
    if (next.has(dateStr)) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
    }
    setSelectedDates(next);
  };

  const toggleSlot = (slot: TimeSlot) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleSave = async () => {
    if (selectedDates.size === 0 || selectedSlots.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: Array.from(selectedDates).sort(),
          time_slots: selectedSlots,
          comment,
        }),
      });

      if (res.ok) {
        router.push("/calendar");
        router.refresh();
        return;
      }
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
    <div>
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">まとめてシェア</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Calendar for date selection */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>日付を選択（複数OK）</h2>

          <div className="mb-3 flex items-center justify-between">
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

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ color: i === 0 ? "var(--color-hot)" : i === 6 ? "var(--color-primary)" : undefined }}>{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, currentMonth);
              const isPast = isBefore(day, new Date(today));
              const isSelected = selectedDates.has(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => inMonth && !isPast && toggleDate(dateStr)}
                  disabled={!inMonth || isPast}
                  className="flex h-9 items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-20"
                  style={{
                    backgroundColor: isSelected ? "var(--color-free-self)" : isToday(day) ? "var(--color-today)" : "transparent",
                    color: isSelected || isToday(day) ? "white" : "var(--color-text)",
                    fontWeight: isSelected || isToday(day) ? 700 : 400,
                  }}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {selectedDates.size > 0 && (
            <p className="mt-2 text-xs text-center" style={{ color: "var(--color-primary)" }}>
              {selectedDates.size}日選択中
            </p>
          )}
        </section>

        {/* Time slot picker */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>時間帯を選択</h2>
          <div className="flex gap-2">
            {SLOTS.map((slot) => {
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className="flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: isSelected ? "var(--color-free-self)" : "var(--color-surface)",
                    color: isSelected ? "white" : "var(--color-text)",
                    borderColor: isSelected ? "var(--color-free-self)" : "var(--color-border)",
                  }}
                >
                  {TIME_SLOT_LABELS[slot]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Comment */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>ひとこと</h2>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="何したい？（例: 飲みたい、どこか行きたい）"
            maxLength={100}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          />
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || selectedDates.size === 0 || selectedSlots.length === 0}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
          style={{ backgroundColor: "var(--color-free-self)" }}
        >
          {saving ? "保存中..." : `${selectedDates.size}日分まとめてシェアする`}
        </button>

        <p className="text-xs text-center" style={{ color: "var(--color-text-secondary)" }}>
          ※ 既にシェア済みの日は上書きされます
        </p>
      </div>
    </div>
  );
}
