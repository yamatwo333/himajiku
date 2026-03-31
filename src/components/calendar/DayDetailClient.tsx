"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parse } from "date-fns";
import { ja } from "date-fns/locale";
import FriendAvailabilityList from "@/components/FriendAvailabilityList";
import PageHeader from "@/components/PageHeader";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { getTodayInTokyo } from "@/lib/date";
import {
  buildCalendarUrl as buildCalendarUrlForGroup,
  readStoredCalendarMonth,
} from "@/lib/calendar";
import type { AvailabilityWithUser, TimeSlot } from "@/lib/types";

interface DayDetailClientProps {
  currentUserId: string;
  dateStr: string;
  groupId: string;
  initialAvailabilities: AvailabilityWithUser[];
}

export default function DayDetailClient({
  currentUserId,
  dateStr,
  groupId,
  initialAvailabilities,
}: DayDetailClientProps) {
  const router = useRouter();
  const date = dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : new Date();
  const dateValid = isValid(date);
  const dateLabel = dateValid ? format(date, "M月d日 (E)", { locale: ja }) : dateStr;
  const isPastDate = dateStr < getTodayInTokyo();
  const myAvailability = useMemo(
    () => initialAvailabilities.find((availability) => availability.userId === currentUserId),
    [currentUserId, initialAvailabilities]
  );
  const [dayAvails] = useState(initialAvailabilities);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(myAvailability?.timeSlots ?? []);
  const [comment, setComment] = useState(myAvailability?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const hasExisting = Boolean(myAvailability);

  const getCalendarUrl = () => buildCalendarUrlForGroup(groupId, readStoredCalendarMonth());

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(getCalendarUrl());
  };

  const handleSave = async () => {
    if (isPastDate) return;
    setSaving(true);

    try {
      await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          time_slots: selectedSlots,
          comment,
        }),
      });
    } catch {
      // ignore
    }

    setSaving(false);
    router.push(getCalendarUrl());
  };

  const isFree = selectedSlots.length > 0;
  const friendCount = dayAvails.filter(
    (availability) => availability.userId !== currentUserId
  ).length;

  return (
    <div>
      <PageHeader
        title={dateLabel}
        onBack={handleBack}
        trailing={
          friendCount > 0 ? (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            >
              {friendCount}人がヒマ
            </span>
          ) : null
        }
      />

      <div className="space-y-6 px-4 pt-5 pb-8">
        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            この日ヒマ？
          </h2>
          <TimeSlotPicker selected={selectedSlots} onChange={setSelectedSlots} disabled={isPastDate} />
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {isPastDate ? "当日より前の日付はヒマをシェアできません" : "ヒマな時間帯をタップ（複数選択OK）"}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ※ ヒマのシェアは参加中の全グループに反映されます
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            ひとこと
          </h2>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="何したい？（例: 飲みたい、どこか行きたい）"
            maxLength={100}
            disabled={isPastDate}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          />
        </section>

        {!isPastDate && (isFree || hasExisting) && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-3.5 text-base font-bold transition-transform active:scale-[0.97] disabled:opacity-50"
            style={{
              backgroundColor: isFree ? "var(--color-free-self)" : "transparent",
              color: isFree ? "white" : "var(--color-hot)",
              border: isFree ? "none" : "1px solid var(--color-border)",
            }}
          >
            {saving ? "保存中..." : isFree ? "ヒマをシェアする" : "ヒマを解除する"}
          </button>
        )}

        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            この日ヒマな人
          </h2>
          <FriendAvailabilityList availabilities={dayAvails} currentUserId={currentUserId} />
        </section>
      </div>
    </div>
  );
}
