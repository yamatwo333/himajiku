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

  const cacheKey = useMemo(
    () => `${selectedGroupId}:${format(currentMonth, "yyyy-MM")}`,
    [currentMonth, selectedGroupId]
  );

  const syncCalendarUrl = useCallback((groupId: string, month: Date) => {
    replaceCalendarViewInUrl({ groupId, month });
  }, []);

  const fetchAvailabilities = useCallback(async () => {
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setAvailabilities(cached.availabilities);
      setCurrentUserId(cached.currentUserId);
      setAvailabilitiesLoading(false);
      return;
    }

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
        const nextAvailabilities = data.availabilities || [];
        const nextCurrentUserId = data.currentUserId || null;
        cacheRef.current.set(cacheKey, {
          availabilities: nextAvailabilities,
          currentUserId: nextCurrentUserId,
        });
        setAvailabilities(nextAvailabilities);
        setCurrentUserId(nextCurrentUserId);
      }
    } catch {
      // ignore
    }

    setAvailabilitiesLoading(false);
  }, [cacheKey, currentMonth, selectedGroupId]);

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

    if (changed) {
      setAvailabilitiesLoading(true);
      syncCalendarUrl(nextGroupId, nextMonth);
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

      <div className="space-y-3 px-4 pt-3">
        {selectedGroupId ? (
          <button
            onClick={() => router.push(`/groups/${selectedGroupId}`)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,165,233,0.16), rgba(14,165,233,0.08))",
              border: "1px solid rgba(14,165,233,0.18)",
              color: "var(--color-text)",
            }}
          >
            <div>
              <p className="text-base font-bold">このグループの設定を見る</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                通知条件や招待情報、LINE連携を確認できます
              </p>
            </div>
            <svg
              width="20"
              height="20"
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
        ) : null}

        <button
          onClick={() => router.push("/calendar/bulk")}
          className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(245,158,11,0.08))",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "var(--color-text)",
          }}
        >
          <div>
            <p className="text-base font-bold">ヒマな日をまとめてシェア</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              当日以降の予定をまとめて入れて、あとから微調整できます
            </p>
          </div>
          <svg
            width="20"
            height="20"
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
    </div>
  );
}
