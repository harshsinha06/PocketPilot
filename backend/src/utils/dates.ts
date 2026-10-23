const IST = "Asia/Kolkata";

export function istCalendar(now = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return { year, month, day };
}

export function currentMonthInIst(now = new Date()): { year: number; month: number } {
  const { year, month } = istCalendar(now);
  return { year, month };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function monthShortLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export type MonthRelation = "past" | "current" | "future";

export function monthTiming(year: number, month: number, now = new Date()) {
  const today = istCalendar(now);
  const length = daysInMonth(year, month);
  const cursor = year * 12 + month;
  const todayCursor = today.year * 12 + today.month;

  if (cursor < todayCursor) {
    return {
      daysInMonth: length,
      dayOfMonth: length,
      daysElapsed: length,
      remainingDays: 0,
      relation: "past" as MonthRelation,
    };
  }

  if (cursor > todayCursor) {
    return {
      daysInMonth: length,
      dayOfMonth: 0,
      daysElapsed: 0,
      remainingDays: length,
      relation: "future" as MonthRelation,
    };
  }

  const day = Math.min(today.day, length);
  return {
    daysInMonth: length,
    dayOfMonth: day,
    daysElapsed: day,
    remainingDays: length - day + 1,
    relation: "current" as MonthRelation,
  };
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function parseMonthYear(
  monthValue: unknown,
  yearValue: unknown,
  now = new Date()
): { year: number; month: number } | null {
  if (isBlank(monthValue) && isBlank(yearValue)) return currentMonthInIst(now);
  if (isBlank(monthValue) || isBlank(yearValue)) return null;

  const month = typeof monthValue === "number" ? monthValue : Number(String(monthValue).trim());
  const year = typeof yearValue === "number" ? yearValue : Number(String(yearValue).trim());
  const yearText = String(yearValue).trim();

  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (typeof yearValue === "string" && !/^\d{4}$/.test(yearText)) return null;
  return { year, month };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function istMonthRange(year: number, month: number): { start: Date; end: Date } {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: new Date(`${year}-${pad(month)}-01T00:00:00+05:30`),
    end: new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+05:30`),
  };
}

export function parseIstDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  if (formatted !== value) return null;

  const year = Number(value.slice(0, 4));
  const { year: currentYear } = currentMonthInIst();
  if (year < 2000 || year > currentYear + 1) return null;

  return date;
}
