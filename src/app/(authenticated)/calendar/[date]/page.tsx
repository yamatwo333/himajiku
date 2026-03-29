"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { TimeSlot, AvailabilityWithUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import FriendAvailabilityList from "@/components/FriendAvailabilityList";

function DayDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStr = params.date as string;
  const groupId = searchParams.get("group") || "";
  const date = parse(dateStr, "yyyy-MM-dd", new Date());

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dayAvails, setDayAvails] = useState<AvailabilityWithUser[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // If group is specified, only show members of that group
    let memberIds: string[] | null = null;
    if (groupId) {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (members) memberIds = members.map((m) => m.user_id);
    }

    let query = supabase
      .from("availability")
      .select("*, user:profiles(*)")
      .eq("date", dateStr);

    if (memberIds) {
      query = query.in("user_id", memberIds);
    }

    const { data } = await query;

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
        setHasExisting(true);
      }
    }
    setLoading(false);
  }, [dateStr, groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);

    const supabase = createClient();

    if (selectedSlots.length === 0 && hasExisting) {
      await supabase
        .from("availability")
        .delete()
        .eq("user_id", currentUserId)
        .eq("date", dateStr);
    } else if (selectedSlots.length > 0) {
      await supabase.from("availability").upsert(
        {
          user_id: currentUserId,
          date: dateStr,
          time_slots: selectedSlots,
          comment,
        },
        { onConflict: "user_id,date" }
      );

      // グループごとに通知チェック
      if (groupId) {
        try {
          await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: dateStr, group_id: groupId }),
          });
        } catch {
          // 通知失敗は無視
        }
      }
    }

    setSaving(false);
    router.push("/calendar");
    router.refresh();
  };

  const isFree = selectedSlots.length > 0;
  const friendCount = dayAvails.filter(
    (a) => a.userId !== currentUserId
  ).length;

  if (loading) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
          <h1 className="text-lg font-bold">{format(date, "M月d日 (E)", { locale: ja })}</h1>
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
        <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">{format(date, "M月d日 (E)", { locale: ja })}</h1>
        {friendCount > 0 && (
          <span
            className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{
              backgroundColor: friendCount + (isFree ? 1 : 0) >= 3 ? "var(--color-hot)" : "var(--color-free-friend)",
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
            className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: isFree ? "var(--color-primary)" : "var(--color-text-secondary)" }}
          >
            {saving ? "保存中..." : isFree ? "ヒマを登録する" : "ヒマを解除する"}
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

export default function DayDetailPage() {
  return (
    <Suspense>
      <DayDetailContent />
    </Suspense>
  );
}
