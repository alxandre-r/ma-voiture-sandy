import { describe, expect, it } from 'vitest';

import { addDays, addMonths, daysBetween, toISODate, toTimestamp } from '@/lib/demo/dates';

describe('demo dates', () => {
  it('formats a Date as YYYY-MM-DD (UTC)', () => {
    expect(toISODate(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months and clamps the day to the target month length', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-01', -24)).toBe('2024-10-01');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
  });

  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-09-01', '2026-10-01')).toBe(30);
    expect(daysBetween('2026-10-01', '2026-09-01')).toBe(-30);
  });

  it('builds a Supabase-like timestamptz string', () => {
    expect(toTimestamp('2026-10-13')).toBe('2026-10-13T00:00:00+00:00');
    expect(toTimestamp('2026-10-13', '17:30:00')).toBe('2026-10-13T17:30:00+00:00');
  });
});
