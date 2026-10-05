import { endOfDay, subMonths, subYears } from 'date-fns';

import type { PeriodSelection } from '@/types/period';

export interface PeriodDateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Resolves a PeriodSelection to concrete start/end Date objects.
 * Preset periods are evaluated relative to the current date each call — so "Ce mois"
 * always means the current month regardless of when the selection was persisted.
 */
export function getEffectivePeriodRange(selection: PeriodSelection): PeriodDateRange {
  const now = new Date();

  if (typeof selection === 'object' && selection.preset === 'custom') {
    return { start: new Date(selection.start), end: new Date(selection.end) };
  }

  switch (selection) {
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
    case '3months':
      return { start: subMonths(now, 3), end: null };
    case '6months':
      return { start: subMonths(now, 6), end: null };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: null };
    case '12months':
      return { start: subMonths(now, 12), end: null };
    case 'all':
    default:
      return { start: null, end: null };
  }
}

/**
 * Returns the period range immediately preceding the given selection, with the same duration.
 * Used to compute trend comparisons on stat cards.
 * Returns null for 'all' (no meaningful previous period).
 */
export function getPreviousPeriodRange(selection: PeriodSelection): PeriodDateRange | null {
  const now = new Date();

  if (typeof selection === 'object' && selection.preset === 'custom') {
    const start = new Date(selection.start);
    const end = new Date(selection.end);
    const durationMs = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - durationMs),
      end: new Date(start.getTime() - 1),
    };
  }

  // 'month' and 'year' are to-date periods: compare with the same span of the previous
  // month/year (1st → same day), not with the whole previous month/year.
  switch (selection) {
    case 'month': {
      const prevMonth = subMonths(now, 1); // date-fns clamps the 31st to the month's last day
      return {
        start: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1),
        end: endOfDay(prevMonth),
      };
    }
    case '3months':
      return { start: subMonths(now, 6), end: subMonths(now, 3) };
    case '6months':
      return { start: subMonths(now, 12), end: subMonths(now, 6) };
    case 'year': {
      const prevYear = subYears(now, 1);
      return { start: new Date(prevYear.getFullYear(), 0, 1), end: endOfDay(prevYear) };
    }
    case '12months':
      return { start: subYears(now, 2), end: subYears(now, 1) };
    case 'all':
    default:
      return null;
  }
}

/**
 * Whether a vehicle is part of the current selection. An empty selection means
 * "all vehicles", everywhere in the app.
 */
export function isVehicleSelected(selectedVehicleIds: number[], vehicleId: number): boolean {
  return selectedVehicleIds.length === 0 || selectedVehicleIds.includes(vehicleId);
}

/**
 * Filters items by selected vehicle IDs and period.
 *
 * - Empty `selectedVehicleIds` → no vehicle filter applied (show all vehicles)
 * - `period` of 'all' → no date filter applied
 * - Custom period applies both start (inclusive) and end (inclusive, end of day)
 *
 * @param items             Array of items with `vehicle_id` and `date` fields
 * @param selectedVehicleIds Vehicle IDs to keep (empty = keep all)
 * @param period            Period filter
 */
export function filterByVehiclesAndPeriod<T extends { vehicle_id: number; date: string }>(
  items: T[],
  selectedVehicleIds: number[],
  period: PeriodSelection,
): T[] {
  let result = items.filter((item) => isVehicleSelected(selectedVehicleIds, item.vehicle_id));

  const { start, end } = getEffectivePeriodRange(period);

  if (start) {
    result = result.filter((item) => new Date(item.date) >= start);
  }
  if (end) {
    const last = endOfDay(end);
    result = result.filter((item) => new Date(item.date) <= last);
  }

  return result;
}
