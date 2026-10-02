import { describe, expect, it } from 'vitest';

import { DEMO_VEHICLE } from '@/lib/demo/constants';
import { addDays, toTimestamp } from '@/lib/demo/dates';
import { buildDemoSeed } from '@/lib/demo/seed';

const TODAY = '2026-10-01';

describe('buildDemoSeed', () => {
  it('is deterministic for a given day', () => {
    expect(buildDemoSeed(TODAY)).toEqual(buildDemoSeed(TODAY));
  });

  it('keeps entity ids stable whatever the day', () => {
    const ids = (today: string) => {
      const s = buildDemoSeed(today);
      return {
        expenses: s.expenses.map((e) => e.id),
        reminders: s.reminders.map((r) => r.id),
        vehicles: s.vehicles.map((v) => v.id),
        contracts: s.insuranceContracts.map((c) => c.id),
      };
    };
    expect(ids(TODAY)).toEqual(ids('2027-03-15'));
  });

  it('never creates expenses in the future', () => {
    const seed = buildDemoSeed(TODAY);
    expect(seed.expenses.every((e) => e.date <= TODAY)).toBe(true);
  });

  it('has the expected volumes', () => {
    const seed = buildDemoSeed(TODAY);
    expect(seed.vehicles).toHaveLength(4);
    expect(seed.expenses.filter((e) => e.fill)).toHaveLength(230);
    expect(seed.expenses.filter((e) => e.type === 'maintenance')).toHaveLength(20);
    expect(seed.expenses.filter((e) => e.type === 'other')).toHaveLength(20);
    expect(seed.insuranceContracts).toHaveLength(5);
    expect(seed.reminders).toHaveLength(6);
  });

  it('uses the French fuel labels written by VehicleForm', () => {
    const seed = buildDemoSeed(TODAY);
    expect(seed.vehicles.map((v) => v.fuel_type)).toEqual([
      'Diesel',
      'Électrique',
      'Hybride rechargeable',
      'Essence',
    ]);
  });

  it('dates relative situations from today', () => {
    const seed = buildDemoSeed(TODAY);
    const p308 = seed.vehicles.find((v) => v.id === DEMO_VEHICLE.peugeot308)!;
    expect(p308.tech_control_expiry).toBe(addDays(TODAY, 12));

    const lastFill = seed.expenses
      .filter((e) => e.vehicle_id === DEMO_VEHICLE.peugeot308 && e.fill)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    expect(lastFill.date).toBe(addDays(TODAY, -3));
    expect(p308.odometer).toBe(lastFill.fill!.odometer);

    const ct = seed.reminders.find((r) => r.id === 701)!;
    expect(ct.due_date).toBe(toTimestamp(addDays(TODAY, 12)));
  });

  it('puts the 308 oil change reminder 1 200 km ahead', () => {
    const seed = buildDemoSeed(TODAY);
    const p308 = seed.vehicles.find((v) => v.id === DEMO_VEHICLE.peugeot308)!;
    const oil = seed.reminders.find((r) => r.maintenance_type_id === 'oil_change')!;
    expect(oil.due_odometer! - p308.odometer).toBe(1_200);
  });
});
