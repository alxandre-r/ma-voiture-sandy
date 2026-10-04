import { describe, expect, it } from 'vitest';

import {
  addDaysIso,
  addMonthsIso,
  daysBetweenIso,
  getLocalToday,
  getParisToday,
} from '@/lib/utils/isoDate';

describe('isoDate', () => {
  it('formats the local calendar date, not the UTC one', () => {
    // 00:30 local time on Oct 2 — toISOString would give Oct 1 in UTC+2
    expect(getLocalToday(new Date(2026, 9, 2, 0, 30))).toBe('2026-10-02');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months and clamps to the month length', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsIso('2026-01-31', 2)).toBe('2026-03-31');
  });

  it('counts days between two dates', () => {
    expect(daysBetweenIso('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetweenIso('2026-10-02', '2026-10-01')).toBe(-1);
  });

  it('getParisToday gives the French date whatever the server timezone', () => {
    // 22:30 UTC is already the next day in Paris (summer, UTC+2) …
    expect(getParisToday(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05');
    // … and 23:30 UTC in winter (UTC+1)
    expect(getParisToday(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(getParisToday(new Date('2026-10-04T12:00:00Z'))).toBe('2026-10-04');
  });
});
