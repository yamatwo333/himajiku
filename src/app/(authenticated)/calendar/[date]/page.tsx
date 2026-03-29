"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { TimeSlot, AvailabilityWithUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import FriendAvailabilityList from "@/components/FriendAvailabilityList";

export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dateStr = params.date as string;
  const date = parse(dateStr, "yyyy-MM-dd", new Date());

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dayAvails, setDayAvails] = useState<AvailabilityWithUser[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data } = await supabase
      .from("availability")
      .select("*, user:profiles(*)")
      .eq("date", dateStr);

    if (data) {
      const avails: AvailabilityWithUser[] = data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        timeSlots: row.time_slots,
        comment: row.comment,
        user: {
          id: row.user.id,
          displayName: row.user.display_name,
          avatarUrl: row.user.avatar_url,
        },
      }));
      setDayAvails(avails);

      const myAvail = avails.find((a) => a.userId === user?.id);
      if (myAvail) {
        setSelectedSlots(myAvail.timeSlots);
        setComment(myAvail.comment);
      }
    }
  }, [dateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);

    const supabase = createClient();

    if (selectedSlots.length === 0) {
      // 登録解除
      await supabase
        .from("availability")
        .delete()
        .eq("user_id", currentUserId)
        .eq("date", dateStr);
    } else {
      // upsert
      await supabase.from("availability").upsert(
        {
          user_id: currentUserId,
          date: dateStr,
          time_slots: selectedSlots,
          comment,
        },
        { onConflict: "user_id,date" }
      );
    }

    setSaving(false);
    router.push("/calendar");
    router.refresh();
  };

  const isFree = selectedSlots.length > 0;
  const friendCount = dayAvails.filter(
    (a) => a.userId !== currentUserId
  ).length;

  return (
    <div>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center border-b px-4 py-3"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="mr-3 rounded-lg p-1 active:bg-gray-100"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="15,6 9,12 15,18" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">
          {format(date, "M月d日 (E)", { locale: ja })}
        </h1>
        {friendCount > 0 && (
          <span
            className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{
              backgroundColor:
                friendCount + (isFree ? 1 : 0) >= 3
                  ? "var(--color-hot)"
                  : "var(--color-free-friend)",
            }}
          >
            {friendCount}人がヒマ
          </span>
        )}
      </header>

      <div className="space-y-6 px-4 pt-5">
        {/* Toggle free */}
        <section>
          <h2
            className="mb-3 text-sm font-bold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            この日ヒマ？
          </h2>
          <TimeSlotPicker selected={selectedSlots} onChange={setSelectedSlots} />
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ヒマな時間帯をタップ（複数選択OK）
          </p>
        </section>

        {/* Comment */}
        <section>
          <h2
            className="mb-2 text-sm font-bold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ひとこと
          </h2>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="何したい？（例: 飲みたい、どこか行きたい）"
            maxLength={100}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          />
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
          style={{
            backgroundColor: isFree
              ? "var(--color-primary)"
              : "var(--color-text-secondary)",
          }}
        >
          {saving
            ? "保存中..."
            : isFree
              ? "ヒマを登録する"
              : "ヒマを解除する"}
        </button>

        {/* Friends */}
        <section>
          <h2
            className="mb-3 text-sm font-bold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            この日ヒマな人
          </h2>
          <FriendAvailabilityList
            availabilities={dayAvails}
            currentUserId={currentUserId ?? ""}
          />
        </section>
      </div>
    </div>
  );
}
