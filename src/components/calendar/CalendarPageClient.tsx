"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import BrandLogo from "@/components/BrandLogo";
import CalendarGrid from "@/components/CalendarGrid";
import CalendarGroupSelector from "@/components/calendar/CalendarGroupSelector";
import CalendarNoGroupState from "@/components/calendar/CalendarNoGroupState";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import type { AvailabilityWithUser } from "@/lib/types";
import {
  getRequestedGroupIdFromLocation,
  persistCalendarMonth,
  persistSelectedGroupId,
  readSelectedGroupId,
  readStoredCalendarMonth,
  replaceCalendarGroupInUrl,
} from "@/lib/calendar";

interface CalendarGroupInfo {
  id: string;
  name: string;
  notify_threshold: number;
}

interface CalendarPageClientProps {
  initialAvailabilities: AvailabilityWithUser[];
  initialCurrentUserId: string | null;
  initialGroups: CalendarGroupInfo[];
  initialSelectedGroupId: string;
  initialMonthIso: string;
}

export default function CalendarPageClient({
  initialAvailabilities,
  initialCurrentUserId,
  initialGroups,
  initialSelectedGroupId,
  initialMonthIso,
}: CalendarPageClientProps) {
  const router = useRouter();
  const baseDate = useMemo(() => new Date(initialMonthIso), [initialMonthIso]);
  const initialMonth = useMemo(() => new Date(initialMonthIso), [initialMonthIso]);
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>(initialAvailabilities);
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth);
  const [availabilitiesLoading, setAvailabilitiesLoading] = useState(false);
  const [groups] = useState<CalendarGroupInfo[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(initialSelectedGroupId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialCurrentUserId);
  const initializedRef = useRef(false);
  const restoredStateRef = useRef(false);
  const fetchedOnceRef = useRef(false);
  const pendingInitialStateRef = useRef<{ groupId: string; monthTime: number } | null>(null);

  const syncCalendarUrl = useCallback((groupId: string) => {
    replaceCalendarGroupInUrl(groupId);
  }, []);

  const fetchAvailabilities = useCallback(async () => {
    setAvailabilitiesLoading(true);

    try {
      const params = new URLSearchParams({
        start: format(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }), "yyyy-MM-dd"),
        end: format(endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }), "yyyy-MM-dd"),
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
    const requestedGroupId = getRequestedGroupIdFromLocation();
    const savedGroupId = readSelectedGroupId();
    const savedMonth = readStoredCalendarMonth(baseDate);
    let nextGroupId = initialSelectedGroupId;
    let nextMonth = initialMonth;
    let changed = false;

    if (
      !requestedGroupId &&
      savedGroupId &&
      groups.some((group) => group.id === savedGroupId) &&
      savedGroupId !== initialSelectedGroupId
    ) {
      setSelectedGroupId(savedGroupId);
      syncCalendarUrl(savedGroupId);
      nextGroupId = savedGroupId;
      changed = true;
    }

    if (savedMonth.getTime() !== initialMonth.getTime()) {
      setCurrentMonth(savedMonth);
      nextMonth = savedMonth;
      changed = true;
    }

    persistSelectedGroupId(nextGroupId);
    persistCalendarMonth(nextMonth);

    if (changed) {
      setAvailabilitiesLoading(true);
    }

    restoredStateRef.current = changed;
    pendingInitialStateRef.current = {
      groupId: nextGroupId,
      monthTime: nextMonth.getTime(),
    };
    initializedRef.current = true;
  }, [baseDate, groups, initialMonth, initialSelectedGroupId, syncCalendarUrl]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    const pendingInitialState = pendingInitialStateRef.current;
    if (pendingInitialState) {
      const matchesPendingState =
        pendingInitialState.groupId === selectedGroupId &&
        pendingInitialState.monthTime === currentMonth.getTime();

      if (!matchesPendingState) {
        return;
      }

      pendingInitialStateRef.current = null;

      if (!restoredStateRef.current) {
        fetchedOnceRef.current = true;
        return;
      }
    }

    fetchedOnceRef.current = true;

    fetchAvailabilities();
  }, [currentMonth, fetchAvailabilities, selectedGroupId]);

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    persistCalendarMonth(month);
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  return (
    <div>
      <PageHeader backgroundColor="var(--color-bg)">
        <BrandLogo variant="wordmark" />
      </PageHeader>

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
        {availabilitiesLoading ? (
          <PageSpinner />
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
            <div className="mt-4 px-4">
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
