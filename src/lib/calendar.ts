import { addMonths, startOfMonth } from "date-fns";
import { getCurrentMonthDateInTokyo } from "@/lib/date";

export const CALENDAR_MONTH_STORAGE_KEY = "calendarMonth";
export const SELECTED_GROUP_STORAGE_KEY = "selectedGroupId";
export const CALENDAR_STATE_CHANGE_EVENT = "calendar-state-change";
export const CALENDAR_DATA_STALE_KEY = "calendarDataStale";

function dispatchCalendarStateChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CALENDAR_STATE_CHANGE_EVENT));
}

export function getCalendarMonthBounds(now: Date = new Date()) {
  const minMonth = startOfMonth(getCurrentMonthDateInTokyo(now));
  const maxMonth = addMonths(minMonth, 2);

  return { minMonth, maxMonth };
}

export function clampCalendarMonth(month: Date, now: Date = new Date()) {
  const { minMonth, maxMonth } = getCalendarMonthBounds(now);
  const normalizedMonth = startOfMonth(month);

  if (Number.isNaN(normalizedMonth.getTime()) || normalizedMonth < minMonth) {
    return minMonth;
  }

  if (normalizedMonth > maxMonth) {
    return maxMonth;
  }

  return normalizedMonth;
}

export function readStoredCalendarMonth(now: Date = new Date()) {
  if (typeof window === "undefined") {
    return clampCalendarMonth(now, now);
  }

  const saved = sessionStorage.getItem(CALENDAR_MONTH_STORAGE_KEY);
  return saved ? clampCalendarMonth(new Date(saved), now) : clampCalendarMonth(now, now);
}

export function persistCalendarMonth(month: Date) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    CALENDAR_MONTH_STORAGE_KEY,
    startOfMonth(month).toISOString()
  );
  dispatchCalendarStateChange();
}

export function readSelectedGroupId() {
  if (typeof window === "undefined") {
    return "";
  }

  return sessionStorage.getItem(SELECTED_GROUP_STORAGE_KEY) ?? "";
}

export function persistSelectedGroupId(groupId: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (groupId) {
    sessionStorage.setItem(SELECTED_GROUP_STORAGE_KEY, groupId);
    dispatchCalendarStateChange();
    return;
  }

  sessionStorage.removeItem(SELECTED_GROUP_STORAGE_KEY);
  dispatchCalendarStateChange();
}

export function markCalendarDataStale() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(CALENDAR_DATA_STALE_KEY, "1");
  dispatchCalendarStateChange();
}

export function consumeCalendarDataStale() {
  if (typeof window === "undefined") {
    return false;
  }

  const isStale = sessionStorage.getItem(CALENDAR_DATA_STALE_KEY) === "1";

  if (isStale) {
    sessionStorage.removeItem(CALENDAR_DATA_STALE_KEY);
  }

  return isStale;
}

export function getRequestedGroupIdFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("group") ?? "";
}

export function getRequestedCalendarMonthFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  const month = new URLSearchParams(window.location.search).get("month") ?? "";
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
}

export function formatCalendarMonthParam(month: Date) {
  const normalizedMonth = startOfMonth(month);
  return `${normalizedMonth.getFullYear()}-${String(normalizedMonth.getMonth() + 1).padStart(2, "0")}`;
}

export function replaceCalendarViewInUrl({
  groupId,
  month,
}: {
  groupId?: string;
  month?: Date;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (groupId) {
    url.searchParams.set("group", groupId);
  } else {
    url.searchParams.delete("group");
  }

  if (month) {
    url.searchParams.set("month", formatCalendarMonthParam(month));
  } else {
    url.searchParams.delete("month");
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  dispatchCalendarStateChange();
}

export function buildCalendarUrl(groupId: string = "", month?: Date | string) {
  const params = new URLSearchParams();

  if (groupId) {
    params.set("group", groupId);
  }

  if (month) {
    params.set(
      "month",
      typeof month === "string" ? month : formatCalendarMonthParam(month)
    );
  }

  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}
