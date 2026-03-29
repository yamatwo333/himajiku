"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";
import CalendarGrid from "@/components/CalendarGrid";
import { AvailabilityWithUser } from "@/lib/types";

interface GroupInfo {
  id: string;
  name: string;
  notify_threshold: number;
}

export default function CalendarPage() {
  const router = useRouter();
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Fetch groups the user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/groups/mine");
        if (res.ok) {
          const data = await res.json();
          const groupsList = data.groups || [];
          if (groupsList.length > 0) {
            setGroups(groupsList);
            setSelectedGroupId(groupsList[0].id);
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchGroups();
  }, []);

  const fetchAvailabilities = useCallback(async () => {
    if (!selectedGroupId) {
      setAvailabilities([]);
      return;
    }

    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const res = await fetch(
        `/api/availability/month?group=${selectedGroupId}&start=${monthStart}&end=${monthEnd}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.availabilities || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [currentMonth, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchAvailabilities();
    }
  }, [fetchAvailabilities, selectedGroupId]);

  return (
    <div>
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h1 className="text-center text-lg font-bold">
          シェア<span style={{ color: "var(--color-primary)" }}>ヒマ</span>
        </h1>
      </header>

      {/* Group selector */}
      {groups.length > 0 && (
        <div className="px-4 pt-3">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mb-4 text-4xl">&#x1F44B;</div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              まだグループに参加していません
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              グループを作って友達を招待しよう
            </p>
            <button
              onClick={() => router.push("/groups")}
              className="mt-4 rounded-xl px-6 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              グループを作成・参加
            </button>
          </div>
        ) : (
          <CalendarGrid
            availabilities={availabilities}
            onMonthChange={setCurrentMonth}
            groupId={selectedGroupId}
            notifyThreshold={groups.find(g => g.id === selectedGroupId)?.notify_threshold ?? 2}
          />
        )}
      </div>
    </div>
  );
}
