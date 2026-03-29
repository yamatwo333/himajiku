"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { TimeSlot } from "@/lib/types";
import { MOCK_AVAILABILITIES, CURRENT_USER } from "@/lib/mock-data";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import FriendAvailabilityList from "@/components/FriendAvailabilityList";

export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dateStr = params.date as string;
  const date = parse(dateStr, "yyyy-MM-dd", new Date());

  const dayAvails = useMemo(
    () => MOCK_AVAILABILITIES.filter((a) => a.date === dateStr),
    [dateStr]
  );

  const myAvail = dayAvails.find((a) => a.userId === CURRENT_USER.id);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(
    myAvail?.timeSlots || []
  );
  const [comment, setComment] = useState(myAvail?.comment || "");

  const isFree = selectedSlots.length > 0;
  const friendCount = dayAvails.filter(
    (a) => a.userId !== CURRENT_USER.id
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
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            この日ヒマ？
          </h2>
          <TimeSlotPicker selected={selectedSlots} onChange={setSelectedSlots} />
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ヒマな時間帯をタップ（複数選択OK）
          </p>
        </section>

        {/* Comment */}
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
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          />
        </section>

        {/* Save button */}
        {isFree && (
          <button
            onClick={() => {
              // TODO: save to DB
              router.back();
            }}
            className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.97]"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            ヒマを登録する
          </button>
        )}

        {/* Friends */}
        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            この日ヒマな人
          </h2>
          <FriendAvailabilityList
            availabilities={dayAvails}
            currentUserId={CURRENT_USER.id}
          />
        </section>
      </div>
    </div>
  );
}
