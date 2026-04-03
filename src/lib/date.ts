const TOKYO_TIME_ZONE = "Asia/Tokyo";

function getTokyoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

export function getTodayInTokyo(now: Date = new Date()) {
  const { year, month, day } = getTokyoDateParts(now);
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthStartInTokyo(now: Date = new Date()) {
  const { year, month } = getTokyoDateParts(now);
  return `${year}-${month}-01`;
}

export function isDateBeforeTodayInTokyo(date: string, now: Date = new Date()) {
  return date < getTodayInTokyo(now);
}
