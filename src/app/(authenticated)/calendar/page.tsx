"use client";

import BrandLogo from "@/components/BrandLogo";
import CalendarGroupSelector from "@/components/calendar/CalendarGroupSelector";
import CalendarNoGroupState from "@/components/calendar/CalendarNoGroupState";
import CalendarPageHeader from "@/components/calendar/CalendarPageHeader";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { endOfMonth, format, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import CalendarGrid from "@/components/CalendarGrid";
import { AvailabilityWithUser } from "@/lib/types";
import {
  getRequestedGroupIdFromLocation,
  persistCalendarMonth,
  persistSelectedGroupId,
  readSelectedGroupId,
  readStoredCalendarMonth,
  replaceCalendarGroupInUrl,
} from "@/lib/calendar";

interface GroupInfo {
  id: string;
  name: string;
  notify_threshold: number;
}

export default function CalendarPage() {
  const router = useRouter();
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>([]);
  const baseDate = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => readStoredCalendarMonth(baseDate));
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [availabilitiesLoading, setAvailabilitiesLoading] = useState(true);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const requestedGroupId = getRequestedGroupIdFromLocation();
    return requestedGroupId || readSelectedGroupId();
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const syncCalendarUrl = useCallback((groupId: string) => {
    replaceCalendarGroupInUrl(groupId);
  }, []);

  // Fetch groups the user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/groups/mine", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const groupsList = data.groups || [];
          setGroups(groupsList);

          if (groupsList.length > 0) {
            const requestedGroupId = getRequestedGroupIdFromLocation();
            const savedId = readSelectedGroupId();
            const preferredGroupId =
              requestedGroupId && groupsList.some((group: GroupInfo) => group.id === requestedGroupId)
                ? requestedGroupId
                : savedId && groupsList.some((group: GroupInfo) => group.id === savedId)
                  ? savedId
                  : groupsList[0].id;

            setSelectedGroupId(preferredGroupId);
            persistSelectedGroupId(preferredGroupId);
            syncCalendarUrl(preferredGroupId);
          } else {
            setSelectedGroupId("");
            persistSelectedGroupId("");
            syncCalendarUrl("");
          }
        }
      } catch {
        // ignore
      }
      setGroupsLoading(false);
    };
    fetchGroups();
  }, [syncCalendarUrl]);

  const fetchAvailabilities = useCallback(async () => {
    setAvailabilitiesLoading(true);
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
    setAvailabilitiesLoading(false);
  }, [currentMonth, selectedGroupId]);

  useEffect(() => {
    if (groupsLoading) {
      return;
    }

    fetchAvailabilities();
  }, [fetchAvailabilities, groupsLoading]);

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    persistCalendarMonth(month);
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId]
  );
  const loading = groupsLoading || availabilitiesLoading;

  return (
    <div>
      <CalendarPageHeader backgroundColor="var(--color-bg)">
        <BrandLogo variant="wordmark" />
      </CalendarPageHeader>

      <CalendarGroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        onChange={(nextGroupId) => {
          setSelectedGroupId(nextGroupId);
          persistSelectedGroupId(nextGroupId);
          syncCalendarUrl(nextGroupId);
        }}
      />

      <div className="pt-3">
        {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        </div>
        ) : (
          <>
            {groups.length === 0 && (
              <CalendarNoGroupState onOpenGroups={() => router.push("/groups")} />
            )}
            <CalendarGrid
              availabilities={availabilities}
              onMonthChange={handleMonthChange}
              groupId={selectedGroupId}
              notifyThreshold={selectedGroup?.notify_threshold ?? 2}
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
