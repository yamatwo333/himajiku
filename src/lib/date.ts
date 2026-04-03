const TOKYO_TIME_ZONE = "Asia/Tokyo";

function getInjectedNowIso() {
  return process.env.NEXT_PUBLIC_E2E_NOW_ISO || process.env.E2E_NOW_ISO || "";
}

export function getReferenceNow() {
  const injectedNowIso = getInjectedNowIso();

  if (!injectedNowIso) {
    return new Date();
  }

  const parsed = new Date(injectedNowIso);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

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

export function getTodayInTokyo(now: Date = getReferenceNow()) {
  const { year, month, day } = getTokyoDateParts(now);
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthDateInTokyo(now: Date = getReferenceNow()) {
  const { year, month } = getTokyoDateParts(now);
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1, 12));
}

export function getCurrentMonthStartInTokyo(now: Date = getReferenceNow()) {
  const { year, month } = getTokyoDateParts(now);
  return `${year}-${month}-01`;
}

export function isDateBeforeTodayInTokyo(date: string, now: Date = getReferenceNow()) {
  return date < getTodayInTokyo(now);
}
