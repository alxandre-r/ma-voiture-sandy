/**
 * @file lib/demo/dates.ts
 * @description Pure date helpers for the demo seed. All dates are `YYYY-MM-DD` strings in UTC.
 */

const DAY_MS = 86_400_000;

/** Parses a YYYY-MM-DD string at noon UTC, far from any DST edge. */
function parse(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parse(iso).getTime() + days * DAY_MS));
}

/** Adds calendar months, clamping the day to the target month length (Jan 31 + 1 month = Feb 28). */
export function addMonths(iso: string, months: number): string {
  const date = parse(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toISODate(date);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / DAY_MS);
}

/** Same shape as the timestamptz strings returned by Supabase. */
export function toTimestamp(iso: string, time = '00:00:00'): string {
  return `${iso.slice(0, 10)}T${time}+00:00`;
}
