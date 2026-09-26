const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && utcDateKey(parsed) === value;
}

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(now: Date = new Date()): string {
  return utcDateKey(now);
}

/** True once a puzzle's own day is over, which makes an opening a replay. */
export function isPastUtcDate(dateKey: string, now: Date = new Date()): boolean {
  return dateKey < todayUtc(now);
}

export function addUtcDays(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return utcDateKey(base);
}

export function recentUtcDateKeys(count: number, now: Date = new Date()): string[] {
  const today = todayUtc(now);
  return Array.from({ length: count }, (_, index) => addUtcDays(today, -index));
}

export function nextResetAtUtc(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
}

export function resetAtUtcFor(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function formatUtcDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(resetAtUtcFor(dateKey));
}

export function formatLocalTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
