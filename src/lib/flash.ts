export const CALENDAR_FLASH_STORAGE_KEY = "calendarFlash";

export type CalendarFlashType = "saved";

export function markCalendarFlash(type: CalendarFlashType) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(CALENDAR_FLASH_STORAGE_KEY, type);
}

export function consumeCalendarFlash(): CalendarFlashType | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(CALENDAR_FLASH_STORAGE_KEY);

  if (value === "saved") {
    sessionStorage.removeItem(CALENDAR_FLASH_STORAGE_KEY);
    return value;
  }

  return null;
}
