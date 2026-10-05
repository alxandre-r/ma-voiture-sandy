import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMonthKeys, computeStatistics, filterExpenses } from '@/lib/utils/statisticsUtils';

import type { Expense } from '@/types/expense';
import type { PeriodSelection } from '@/types/period';
import type { Vehicle } from '@/types/vehicle';

// Fixed "today": 4 October 2026, midday local time
const NOW = new Date(2026, 9, 4, 12, 0, 0);

const vehicles = [{ vehicle_id: 1, name: 'Clio', fuel_type: 'gasoline' }] as unknown as Vehicle[];

let nextId = 1;
const expense = (date: string, amount: number): Expense =>
  ({
    id: nextId++,
    vehicle_id: 1,
    type: 'maintenance',
    amount,
    date,
    odometer: null,
    liters: null,
    kwh: null,
  }) as Expense;

const stats = (all: Expense[], period: PeriodSelection) =>
  computeStatistics(filterExpenses(all, [1], period), all, vehicles, [1], period);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildMonthKeys — rolling periods (B22)', () => {
  it.each([
    ['3months', 4, '2026-06'],
    ['6months', 7, '2026-03'],
    ['12months', 13, '2025-09'],
  ] as const)('%s includes the partial oldest month', (period, length, firstKey) => {
    const keys = buildMonthKeys(period, NOW, 0);
    expect(keys).toHaveLength(length);
    // sortKey months are 0-based: '2026-06' is July
    expect(keys[0].sortKey).toBe(firstKey);
    expect(keys[keys.length - 1].sortKey).toBe('2026-09');
  });

  it('keeps one bucket per month for the to-date presets', () => {
    expect(buildMonthKeys('month', NOW, 1)).toHaveLength(1);
    expect(buildMonthKeys('year', NOW, 10)).toHaveLength(10);
  });
});

describe('computeStatistics — rolling periods (B22)', () => {
  it('charts the expenses of the partial oldest month, so the chart adds up to the total', () => {
    // 3 last months from 4 Oct = from 4 Jul: 20 Jul is in, 1 Jul is out
    const all = [expense('2026-07-01', 999), expense('2026-07-20', 80), expense('2026-09-10', 20)];
    const result = stats(all, '3months');
    expect(result.totalCost).toBe(100);
    const charted = result.expensesByMonth.reduce((sum, m) => sum + m.total, 0);
    expect(charted).toBe(100);
    expect(result.expensesByMonth[0].total).toBe(80);
  });
});

describe('computeStatistics — year trend (B22)', () => {
  const all = [
    expense('2025-03-01', 100), // same span of last year (1 Jan → 4 Oct)
    expense('2025-10-04', 50), // the same day last year still counts
    expense('2025-10-10', 300), // after the same day: not comparable
    expense('2025-12-01', 550),
    expense('2026-02-01', 300),
  ];

  it('compares year to date with the same span of last year', () => {
    const result = stats(all, 'year');
    expect(result.totalCost).toBe(300);
    expect(result.previousPeriodCost).toBe(150);
    expect(result.trendPercentage).toBe(100);
  });

  it('still reports the full previous year for the projection comparison', () => {
    expect(stats(all, 'year').previousYearTotal).toBe(1000);
  });
});
