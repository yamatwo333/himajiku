"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { addMonths, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
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
  const minMonth = startOfMonth(new Date());
  const maxMonth = startOfMonth(addMonths(new Date(), 2));
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
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const requestedGroupId = new URLSearchParams(window.location.search).get("group");
      return requestedGroupId || sessionStorage.getItem("selectedGroupId") || "";
    }
    return "";
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const syncCalendarUrl = useCallback((groupId: string) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (groupId) {
      url.searchParams.set("group", groupId);
    } else {
      url.searchParams.delete("group");
    }

    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new Event("selected-group-change"));
  }, []);

  // Fetch groups the user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/groups/mine");
        if (res.ok) {
          const data = await res.json();
          const groupsList = data.groups || [];
          setGroups(groupsList);

          if (groupsList.length > 0) {
            const requestedGroupId =
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("group")
                : null;
            const savedId = sessionStorage.getItem("selectedGroupId");
            const preferredGroupId =
              requestedGroupId && groupsList.some((group: GroupInfo) => group.id === requestedGroupId)
                ? requestedGroupId
                : savedId && groupsList.some((group: GroupInfo) => group.id === savedId)
                  ? savedId
                  : groupsList[0].id;

            setSelectedGroupId(preferredGroupId);
            sessionStorage.setItem("selectedGroupId", preferredGroupId);
            syncCalendarUrl(preferredGroupId);
          } else {
            setSelectedGroupId("");
            sessionStorage.removeItem("selectedGroupId");
            syncCalendarUrl("");
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchGroups();
  }, [syncCalendarUrl]);

  const fetchAvailabilities = useCallback(async () => {
    setLoading(true);
    const monthStart = format(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }), "yyyy-MM-dd");
    const monthEnd = format(endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }), "yyyy-MM-dd");

    try {
      const params = new URLSearchParams({
        start: monthStart,
        end: monthEnd,
      });

      if (selectedGroupId) {
        params.set("group", selectedGroupId);
      }

      const res = await fetch(`/api/availability/month?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.availabilities || []);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [currentMonth, selectedGroupId]);

  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities, selectedGroupId]);

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    sessionStorage.setItem("calendarMonth", month.toISOString());
  }, []);

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
            onChange={(e) => {
              const nextGroupId = e.target.value;
              setSelectedGroupId(nextGroupId);
              sessionStorage.setItem("selectedGroupId", nextGroupId);
              syncCalendarUrl(nextGroupId);
            }}
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
        ) : (
          <>
            {groups.length === 0 && (
              <div className="px-4 pb-3">
                <div
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
                >
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    ひとりでも先にヒマをシェアできます
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    グループに参加すると、友達のヒマや「集まったっていい」の表示も見られるようになります。
                  </p>
                  <button
                    onClick={() => router.push("/groups")}
                    className="mt-3 rounded-lg px-4 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    グループを作成・参加
                  </button>
                </div>
              </div>
            )}
            <CalendarGrid
              availabilities={availabilities}
              onMonthChange={handleMonthChange}
              groupId={selectedGroupId}
              notifyThreshold={groups.find(g => g.id === selectedGroupId)?.notify_threshold ?? 2}
              currentUserId={currentUserId}
              initialMonth={currentMonth}
            />
            <div className="px-4 mt-4">
              <button
                onClick={() => router.push("/calendar/bulk")}
                className="w-full rounded-xl border py-3 text-sm font-medium"
                style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}
              >
                ヒマな日をまとめてシェア
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
