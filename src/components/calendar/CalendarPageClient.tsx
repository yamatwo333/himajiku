"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import BrandLogo from "@/components/BrandLogo";
import CalendarGrid from "@/components/CalendarGrid";
import CalendarGroupSelector from "@/components/calendar/CalendarGroupSelector";
import CalendarNoGroupState from "@/components/calendar/CalendarNoGroupState";
import PageHeader from "@/components/PageHeader";
import PageSpinner from "@/components/PageSpinner";
import type { AvailabilityWithUser } from "@/lib/types";
import {
  consumeCalendarDataStale,
  getCalendarMonthBounds,
  getRequestedCalendarMonthFromLocation,
  getRequestedGroupIdFromLocation,
  replaceCalendarViewInUrl,
  persistCalendarMonth,
  persistSelectedGroupId,
  readSelectedGroupId,
  readStoredCalendarMonth,
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
  const { minMonth, maxMonth } = useMemo(() => getCalendarMonthBounds(), []);
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
  const forceRefreshRef = useRef(false);
  const cacheRef = useRef(
    new Map<
      string,
      { availabilities: AvailabilityWithUser[]; currentUserId: string | null }
    >([
      [
        `${initialSelectedGroupId}:${format(initialMonth, "yyyy-MM")}`,
        { availabilities: initialAvailabilities, currentUserId: initialCurrentUserId },
      ],
    ])
  );

  const syncCalendarUrl = useCallback((groupId: string, month: Date) => {
    replaceCalendarViewInUrl({ groupId, month });
  }, []);

  const fetchAvailabilitySnapshot = useCallback(
    async ({
      month,
      groupId,
      force = false,
      withLoading = false,
    }: {
      month: Date;
      groupId: string;
      force?: boolean;
      withLoading?: boolean;
    }) => {
      const key = `${groupId}:${format(month, "yyyy-MM")}`;
      const cached = cacheRef.current.get(key);

      if (!force && cached) {
        return cached;
      }

      if (withLoading) {
        setAvailabilitiesLoading(true);
      }

      try {
        const params = new URLSearchParams({
          start: format(startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), "yyyy-MM-dd"),
          end: format(endOfWeek(endOfMonth(month), { weekStartsOn: 0 }), "yyyy-MM-dd"),
        });

        if (groupId) {
          params.set("group", groupId);
        }

        const res = await fetch(`/api/availability/month?${params.toString()}`);

        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        const nextAvailabilities = data.availabilities || [];
        const nextCurrentUserId = data.currentUserId || null;

        const snapshot = {
          availabilities: nextAvailabilities,
          currentUserId: nextCurrentUserId,
        };

        cacheRef.current.set(key, snapshot);

        return snapshot;
      } catch {
        return null;
      } finally {
        if (withLoading) {
          setAvailabilitiesLoading(false);
        }
      }
    },
    []
  );

  const fetchAvailabilities = useCallback(async (options?: { force?: boolean }) => {
    const snapshot = await fetchAvailabilitySnapshot({
      month: currentMonth,
      groupId: selectedGroupId,
      force: options?.force,
      withLoading: true,
    });

    if (!snapshot) {
      return;
    }

    setAvailabilities(snapshot.availabilities);
    setCurrentUserId(snapshot.currentUserId);
  }, [currentMonth, fetchAvailabilitySnapshot, selectedGroupId]);

  useEffect(() => {
    const requestedGroupId = getRequestedGroupIdFromLocation();
    const requestedMonth = getRequestedCalendarMonthFromLocation();
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
      nextGroupId = savedGroupId;
      changed = true;
    }

    if (!requestedMonth && savedMonth.getTime() !== initialMonth.getTime()) {
      setCurrentMonth(savedMonth);
      nextMonth = savedMonth;
      changed = true;
    }

    persistSelectedGroupId(nextGroupId);
    persistCalendarMonth(nextMonth);
    forceRefreshRef.current = consumeCalendarDataStale();

    if (changed) {
      setAvailabilitiesLoading(true);
      syncCalendarUrl(nextGroupId, nextMonth);
    } else if (forceRefreshRef.current) {
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
        if (forceRefreshRef.current) {
          forceRefreshRef.current = false;
          fetchAvailabilities({ force: true });
          return;
        }

        fetchedOnceRef.current = true;
        return;
      }
    }

    fetchedOnceRef.current = true;

    fetchAvailabilities();
  }, [currentMonth, fetchAvailabilities, selectedGroupId]);

  useEffect(() => {
    router.prefetch("/calendar/bulk");

    if (selectedGroupId) {
      router.prefetch(`/groups/${selectedGroupId}`);
    }
  }, [router, selectedGroupId]);

  useEffect(() => {
    if (availabilitiesLoading) {
      return;
    }

    const neighborMonths = [subMonths(currentMonth, 1), addMonths(currentMonth, 1)].filter(
      (month) => month >= minMonth && month <= maxMonth
    );

    neighborMonths.forEach((month) => {
      void fetchAvailabilitySnapshot({
        month,
        groupId: selectedGroupId,
      });
    });
  }, [
    availabilitiesLoading,
    currentMonth,
    fetchAvailabilitySnapshot,
    maxMonth,
    minMonth,
    selectedGroupId,
  ]);

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month);
    persistCalendarMonth(month);
    syncCalendarUrl(selectedGroupId, month);
  }, [selectedGroupId, syncCalendarUrl]);

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
          syncCalendarUrl(nextGroupId, currentMonth);
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
          </>
        )}
      </div>

      <div className="space-y-3 px-4 pt-4 pb-8">
        <button
          onClick={() => router.push("/calendar/bulk")}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          ヒマな日をまとめてシェア
        </button>

        {selectedGroupId ? (
          <div className="flex justify-center">
            <button
              onClick={() => router.push(`/groups/${selectedGroupId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-transform active:scale-[0.98]"
              style={{ color: "var(--color-primary)" }}
            >
              <span>このグループの設定を見る</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10h12" />
                <path d="m10 4 6 6-6 6" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
