"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import { ja } from "date-fns/locale";
import { TimeSlot, AvailabilityWithUser } from "@/lib/types";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import FriendAvailabilityList from "@/components/FriendAvailabilityList";

export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStr = (params.date as string) || "";
  const groupId = searchParams.get("group") || "";

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dayAvails, setDayAvails] = useState<AvailabilityWithUser[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const date = dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : new Date();
  const dateValid = isValid(date);
  const dateLabel = dateValid ? format(date, "M月d日 (E)", { locale: ja }) : dateStr;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!dateStr) return;
    setLoading(true);
    try {
      const groupParam = groupId ? `?group=${groupId}` : "";
      const res = await fetch(`/api/availability/${dateStr}${groupParam}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.currentUserId);
        setDayAvails(data.availabilities || []);

        const myAvail = data.availabilities?.find(
          (a: AvailabilityWithUser) => a.userId === data.currentUserId
        );
        if (myAvail) {
          setSelectedSlots(myAvail.timeSlots);
          setComment(myAvail.comment);
          setHasExisting(true);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [dateStr, groupId]);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [fetchData, mounted]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/calendar");
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return;
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
    router.push("/calendar");
    router.refresh();
  };

  const isFree = selectedSlots.length > 0;
  const friendCount = dayAvails.filter(
    (a) => a.userId !== currentUserId
  ).length;

  if (!mounted || loading) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
          <h1 className="text-lg font-bold">{dateLabel}</h1>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">{dateLabel}</h1>
        {friendCount > 0 && (
          <span
            className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            {friendCount}人がヒマ
          </span>
        )}
      </header>

      <div className="space-y-6 px-4 pt-5 pb-8">
        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>この日ヒマ？</h2>
          <TimeSlotPicker selected={selectedSlots} onChange={setSelectedSlots} />
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>ヒマな時間帯をタップ（複数選択OK）</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>※ ヒマのシェアは参加中の全グループに反映されます</p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>ひとこと</h2>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="何したい？（例: 飲みたい、どこか行きたい）"
            maxLength={100}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          />
        </section>

        {(isFree || hasExisting) && (
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
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>この日ヒマな人</h2>
          <FriendAvailabilityList availabilities={dayAvails} currentUserId={currentUserId ?? ""} />
        </section>
      </div>
    </div>
  );
}
