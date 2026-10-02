import { addDays, daysBetween, toTimestamp } from '../dates';
import { round } from '../random';

import type { Random } from '../random';
import type { DemoExpense } from '../types';

export interface EnergySeriesConfig {
  vehicleId: number;
  firstId: number;
  count: number;
  intervalDays: number;
  /** Days between today and the most recent entry */
  lastDaysAgo: number;
  /** Odometer at the most recent entry */
  endOdometer: number;
  kmPerDay: number;
  kind: 'fuel' | 'charge';
  /** L/100 km for fuel, kWh/100 km for charges */
  consumption: number;
  price: (date: string, index: number) => number;
  ownerFor: (index: number) => string;
  notesFor?: (index: number) => string | null;
  /** Multiplier applied (without noise) to the last entry's quantity, to create an anomaly */
  lastQuantityFactor?: number;
}

/** Generates a fill (or charge) history, oldest first, with consistent odometers. */
export function generateEnergySeries(
  config: EnergySeriesConfig,
  today: string,
  random: Random,
): DemoExpense[] {
  const { count } = config;
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const jitter = i === count - 1 ? 0 : random.int(-2, 2);
    dates.push(
      addDays(today, -(config.lastDaysAgo + (count - 1 - i) * config.intervalDays + jitter)),
    );
  }

  // Distance driven since the previous entry (the first one assumes a regular interval)
  const distances = dates.map((date, i) => {
    const days = i === 0 ? config.intervalDays : Math.max(1, daysBetween(dates[i - 1], date));
    return Math.round(days * config.kmPerDay * random.between(0.85, 1.15));
  });

  const odometers = new Array<number>(count);
  odometers[count - 1] = config.endOdometer;
  for (let i = count - 1; i > 0; i -= 1) odometers[i - 1] = odometers[i] - distances[i];

  return dates.map((date, i) => {
    const isLast = i === count - 1;
    const factor =
      isLast && config.lastQuantityFactor ? config.lastQuantityFactor : random.between(0.95, 1.05);
    const quantity = round((distances[i] * config.consumption * factor) / 100, 2);
    const unitPrice = round(config.price(date, i), 3);
    const isCharge = config.kind === 'charge';
    return {
      id: config.firstId + i,
      vehicle_id: config.vehicleId,
      owner_id: config.ownerFor(i),
      type: isCharge ? 'electric_charge' : 'fuel',
      amount: round(quantity * unitPrice, 2),
      date,
      notes: config.notesFor?.(i) ?? null,
      created_at: toTimestamp(date, '17:30:00'),
      fill: {
        odometer: odometers[i],
        liters: isCharge ? null : quantity,
        price_per_liter: isCharge ? null : unitPrice,
        kwh: isCharge ? quantity : null,
        price_per_kwh: isCharge ? unitPrice : null,
        charge_type: isCharge ? 'charge' : 'fill',
      },
    };
  });
}

interface OdometerPoint {
  date: string;
  odometer: number;
}

function odometerPoints(entries: DemoExpense[]): OdometerPoint[] {
  return entries
    .filter((e) => e.fill?.odometer != null)
    .map((e) => ({ date: e.date, odometer: e.fill!.odometer as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Linear interpolation of the odometer at a date (extrapolated outside the known range). */
export function odometerAt(entries: DemoExpense[], date: string, kmPerDay: number): number {
  const points = odometerPoints(entries);
  const first = points[0];
  const last = points[points.length - 1];
  if (date <= first.date)
    return Math.round(first.odometer - daysBetween(date, first.date) * kmPerDay);
  if (date >= last.date) return Math.round(last.odometer + daysBetween(last.date, date) * kmPerDay);
  const nextIndex = points.findIndex((p) => p.date >= date);
  const before = points[nextIndex - 1];
  const after = points[nextIndex];
  const ratio = daysBetween(before.date, date) / Math.max(1, daysBetween(before.date, after.date));
  return Math.round(before.odometer + (after.odometer - before.odometer) * ratio);
}

/** Inverse of odometerAt: the date at which the odometer reached a value. */
export function dateAtOdometer(entries: DemoExpense[], odometer: number, kmPerDay: number): string {
  const points = odometerPoints(entries);
  const first = points[0];
  if (odometer <= first.odometer) {
    return addDays(first.date, -Math.ceil((first.odometer - odometer) / kmPerDay));
  }
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].odometer >= odometer) {
      const before = points[i - 1];
      const ratio =
        (odometer - before.odometer) / Math.max(1, points[i].odometer - before.odometer);
      return addDays(before.date, Math.round(daysBetween(before.date, points[i].date) * ratio));
    }
  }
  const last = points[points.length - 1];
  return addDays(last.date, Math.ceil((odometer - last.odometer) / kmPerDay));
}
