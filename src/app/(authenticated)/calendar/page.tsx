"use client";

import { useState, useEffect, useCallback } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import CalendarGrid from "@/components/CalendarGrid";
import { AvailabilityWithUser } from "@/lib/types";

interface GroupInfo {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Fetch groups the user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/groups/mine", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const groupsList = data.groups || [];
          if (groupsList.length > 0) {
            setGroups(groupsList);
            // Restore previously selected group from sessionStorage
            const savedGroupId = sessionStorage.getItem("selectedGroupId");
            if (savedGroupId && groupsList.some((g: GroupInfo) => g.id === savedGroupId)) {
              setSelectedGroupId(savedGroupId);
            } else {
              setSelectedGroupId(groupsList[0].id);
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchGroups();
  }, []);

  const fetchAvailabilities = useCallback(async (showLoading = true) => {
    if (!selectedGroupId) {
      setAvailabilities([]);
      return;
    }

    if (showLoading) setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const res = await fetch(
        `/api/availability/month?group=${selectedGroupId}&start=${monthStart}&end=${monthEnd}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.availabilities || []);
      }
    } catch {
      // ignore
    }
    if (showLoading) setLoading(false);
  }, [currentMonth, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      sessionStorage.setItem("selectedGroupId", selectedGroupId);
      fetchAvailabilities();
    }
  }, [fetchAvailabilities, selectedGroupId]);

  // 30秒ごとに自動リフレッシュ（他ユーザーの更新を反映）
  useEffect(() => {
    if (!selectedGroupId) return;
    const interval = setInterval(() => {
      fetchAvailabilities(false);
    }, 30000);
    return () => clearInterval(interval);
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
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              まだグループに参加していません
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              「グループ」タブからグループを作成or参加してください
            </p>
          </div>
        ) : (
          <CalendarGrid
            availabilities={availabilities}
            onMonthChange={setCurrentMonth}
            groupId={selectedGroupId}
          />
        )}
      </div>
    </div>
  );
}
