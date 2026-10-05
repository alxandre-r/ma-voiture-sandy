import {
  filterByVehiclesAndPeriod,
  getEffectivePeriodRange,
  getPreviousPeriodRange,
  isVehicleSelected,
} from '@/lib/utils/filterUtils';

describe('isVehicleSelected', () => {
  it('treats an empty selection as all vehicles', () => {
    expect(isVehicleSelected([], 7)).toBe(true);
  });

  it('checks membership otherwise', () => {
    expect(isVehicleSelected([1, 2], 2)).toBe(true);
    expect(isVehicleSelected([1, 2], 3)).toBe(false);
  });

  it('makes filterByVehiclesAndPeriod keep every vehicle on an empty selection', () => {
    const items = [
      { vehicle_id: 1, date: '2020-01-01' },
      { vehicle_id: 2, date: '2020-01-02' },
    ];
    expect(filterByVehiclesAndPeriod(items, [], 'all')).toHaveLength(2);
  });
});

describe('getPreviousPeriodRange (like-for-like)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("compares 'month' to date with the same span of the previous month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0)); // 5 Oct 2026
    const range = getPreviousPeriodRange('month')!;
    expect(range.start).toEqual(new Date(2026, 8, 1));
    expect(range.end).toEqual(new Date(2026, 8, 5, 23, 59, 59, 999));
  });

  it("clamps 'month' to the previous month's last day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 31, 10, 0)); // 31 Mar 2026
    const range = getPreviousPeriodRange('month')!;
    expect(range.start).toEqual(new Date(2026, 1, 1));
    expect(range.end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it("compares 'year' to date with 1 January → same day last year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    const range = getPreviousPeriodRange('year')!;
    expect(range.start).toEqual(new Date(2025, 0, 1));
    expect(range.end).toEqual(new Date(2025, 9, 5, 23, 59, 59, 999));
  });

  it("returns null for 'all'", () => {
    expect(getPreviousPeriodRange('all')).toBeNull();
  });
});

describe('getEffectivePeriodRange', () => {
  it("returns start = 1st of current month for 'month'", () => {
    const now = new Date();
    const { start, end } = getEffectivePeriodRange('month');
    expect(start).toEqual(new Date(now.getFullYear(), now.getMonth(), 1));
    expect(end).toBeNull();
  });

  it("returns start = 1st January of current year for 'year'", () => {
    const now = new Date();
    const { start, end } = getEffectivePeriodRange('year');
    expect(start).toEqual(new Date(now.getFullYear(), 0, 1));
    expect(end).toBeNull();
  });

  it("returns null start/end for 'all'", () => {
    const { start, end } = getEffectivePeriodRange('all');
    expect(start).toBeNull();
    expect(end).toBeNull();
  });

  it('returns concrete dates for custom period', () => {
    const { start, end } = getEffectivePeriodRange({
      preset: 'custom',
      start: '2026-01-01',
      end: '2026-03-31',
    });
    expect(start).toEqual(new Date('2026-01-01'));
    expect(end).toEqual(new Date('2026-03-31'));
  });

  it("returns a start date ~3 months ago for '3months'", () => {
    const now = new Date();
    const { start, end } = getEffectivePeriodRange('3months');
    expect(start).not.toBeNull();
    expect(end).toBeNull();
    // Should be roughly 3 months back (within a few days)
    const diffMs = now.getTime() - start!.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(85);
    expect(diffDays).toBeLessThan(95);
  });
});

describe('filterByVehiclesAndPeriod', () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Day 10 is always a valid day and always in the current month
  const thisMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`;
  const lastYearStr = `${currentYear - 1}-06-15`;

  const items = [
    { vehicle_id: 1, date: thisMonthStr },
    { vehicle_id: 2, date: thisMonthStr },
    { vehicle_id: 1, date: lastYearStr },
    { vehicle_id: 2, date: lastYearStr },
  ];

  it("returns all items when vehicleIds is empty and period is 'all'", () => {
    expect(filterByVehiclesAndPeriod(items, [], 'all')).toHaveLength(4);
  });

  it('filters by vehicleId', () => {
    const result = filterByVehiclesAndPeriod(items, [1], 'all');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.vehicle_id === 1)).toBe(true);
  });

  it("excludes items before the 1st of current month for period 'month'", () => {
    const result = filterByVehiclesAndPeriod(items, [], 'month');
    const cutoff = new Date(currentYear, currentMonth, 1);
    expect(result).toHaveLength(2);
    expect(result.every((i) => new Date(i.date) >= cutoff)).toBe(true);
  });

  it("excludes items before Jan 1st of current year for period 'year'", () => {
    const result = filterByVehiclesAndPeriod(items, [], 'year');
    const cutoff = new Date(currentYear, 0, 1);
    expect(result.every((i) => new Date(i.date) >= cutoff)).toBe(true);
  });

  it('applies both vehicleId and period filters together', () => {
    const result = filterByVehiclesAndPeriod(items, [1], 'month');
    const cutoff = new Date(currentYear, currentMonth, 1);
    expect(result).toHaveLength(1);
    expect(result[0].vehicle_id).toBe(1);
    expect(new Date(result[0].date) >= cutoff).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(filterByVehiclesAndPeriod([], [1], 'month')).toEqual([]);
  });

  it("returns all items for period 'all'", () => {
    expect(filterByVehiclesAndPeriod(items, [], 'all')).toHaveLength(4);
  });

  it('filters by custom date range (inclusive start and end)', () => {
    const allItems = [
      { vehicle_id: 1, date: '2026-01-15' },
      { vehicle_id: 1, date: '2026-02-20' },
      { vehicle_id: 1, date: '2026-03-31' },
      { vehicle_id: 1, date: '2026-04-01' },
    ];
    const result = filterByVehiclesAndPeriod(allItems, [], {
      preset: 'custom',
      start: '2026-01-01',
      end: '2026-03-31',
    });
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.date)).toEqual(['2026-01-15', '2026-02-20', '2026-03-31']);
  });
});
