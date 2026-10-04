import { describe, expect, it } from 'vitest';

import { computeStatistics } from '@/lib/utils/statisticsUtils';

import type { Expense } from '@/types/expense';
import type { Vehicle } from '@/types/vehicle';

const vehicle = (vehicle_id: number, fuel_type: string, co2_emission: number | null = null) =>
  ({ vehicle_id, name: `V${vehicle_id}`, fuel_type, co2_emission }) as unknown as Vehicle;

// Mid current month: the monthly buckets are built relative to today
const now = new Date();
const DATE = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

let nextId = 1;
const expense = (
  vehicle_id: number,
  type: Expense['type'],
  amount: number,
  extra: Partial<Expense> = {},
): Expense =>
  ({
    id: nextId++,
    vehicle_id,
    type,
    amount,
    date: DATE,
    odometer: null,
    liters: null,
    kwh: null,
    ...extra,
  }) as Expense;

const fuel = (v: number, odometer: number, liters: number, amount: number) =>
  expense(v, 'fuel', amount, { odometer, liters });
const charge = (v: number, odometer: number, kwh: number, amount: number) =>
  expense(v, 'electric_charge', amount, { odometer, kwh });

const run = (expenses: Expense[], vehicles: Vehicle[]) =>
  computeStatistics(
    expenses,
    expenses,
    vehicles,
    vehicles.map((v) => v.vehicle_id),
    'all',
  );

describe('computeStatistics — energy (P2.12–P2.14)', () => {
  // PHEV: 1 000 km, fuel 2..n = 40 L, charges 2..n = 120 kWh
  const phev = vehicle(1, 'plugin_hybrid', 30);
  const phevExpenses = [
    fuel(1, 10_000, 35, 60),
    fuel(1, 11_000, 40, 70),
    charge(1, 10_100, 10, 3),
    charge(1, 10_600, 60, 15),
    charge(1, 11_100, 60, 15),
    expense(1, 'maintenance', 200, { odometer: 9_000 }),
  ];

  it('reports L/100 and kWh/100 separately', () => {
    const stats = run(phevExpenses, [phev]);
    expect(stats.avgConsumption).toBeCloseTo(4, 5);
    expect(stats.avgElectricConsumption).toBeCloseTo(12, 5);
    expect(stats.totalKwh).toBe(130);
  });

  it('splits Carburant and Électricité, with an average cost per charge', () => {
    const stats = run(phevExpenses, [phev]);
    const byName = Object.fromEntries(stats.expenseByCategory.map((c) => [c.name, c.value]));
    expect(byName.Carburant).toBe(130);
    expect(byName['Électricité']).toBe(33);
    expect(stats.avgFillAmount).toBe(65);
    expect(stats.avgChargeAmount).toBe(11);
    const month = stats.expensesByMonth.find((m) => m.total > 0)!;
    expect(month.Carburant).toBe(130);
    expect(month['Électricité']).toBe(33);
  });

  it('hides Électricité when no charge is logged', () => {
    const stats = run([fuel(2, 1000, 40, 70), fuel(2, 1500, 30, 50)], [vehicle(2, 'diesel')]);
    expect(stats.expenseByCategory.map((c) => c.name)).not.toContain('Électricité');
    expect(stats.avgChargeAmount).toBe(0);
  });

  it('computes CO₂ of a PHEV from the energy logged, not the homologated g/km', () => {
    const stats = run(phevExpenses, [phev]);
    // 75 L petrol × 2.28 + 130 kWh × 0.052 = 177.76 kg (homologated: 30 g/km × 2 100 km = 63 kg)
    expect(stats.totalCO2Kg).toBe(178);
    expect(stats.co2Method).toBe('ademe');
  });

  it('still uses the homologated g/km for a fuel-only vehicle', () => {
    const stats = run(
      [fuel(3, 1000, 40, 70), fuel(3, 2000, 50, 80)],
      [vehicle(3, 'gasoline', 120)],
    );
    expect(stats.totalCO2Kg).toBe(120);
    expect(stats.co2Method).toBe('official');
  });
});
