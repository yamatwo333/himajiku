import { addMonths, startOfMonth } from "date-fns";

export const CALENDAR_MONTH_STORAGE_KEY = "calendarMonth";
export const SELECTED_GROUP_STORAGE_KEY = "selectedGroupId";

export function getCalendarMonthBounds(now: Date = new Date()) {
  const minMonth = startOfMonth(now);
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
    return;
  }

  sessionStorage.removeItem(SELECTED_GROUP_STORAGE_KEY);
}

export function getRequestedGroupIdFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("group") ?? "";
}

export function replaceCalendarGroupInUrl(groupId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (groupId) {
    url.searchParams.set("group", groupId);
  } else {
    url.searchParams.delete("group");
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  window.dispatchEvent(new Event("selected-group-change"));
}

export function buildCalendarUrl(groupId: string = "") {
  return groupId ? `/calendar?group=${groupId}` : "/calendar";
}
