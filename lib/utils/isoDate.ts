/**
 * Pure helpers on `YYYY-MM-DD` calendar dates. They compute at noon UTC to stay away from DST edges.
 */
const DAY_MS = 86_400_000;

const parse = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
const format = (date: Date) => date.toISOString().slice(0, 10);

/** The local calendar date (never toISOString, which gives the UTC date). */
export function getLocalToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number): string {
  return format(new Date(parse(iso).getTime() + days * DAY_MS));
}

/** Adds calendar months, clamping the day to the target month (Jan 31 + 1 month = Feb 28). */
export function addMonthsIso(iso: string, months: number): string {
  const date = parse(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return format(date);
}

export function daysBetweenIso(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}
