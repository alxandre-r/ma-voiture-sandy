import { describe, expect, it } from 'vitest';

import {
  electricConsumption,
  formatVehicleConsumption,
  fuelConsumption,
} from '@/lib/utils/consumption';

const fill = (vehicle_id: number, odometer: number | null, liters: number | null) => ({
  vehicle_id,
  type: 'fuel' as const,
  odometer,
  liters,
});

describe('fuelConsumption (full-tank method)', () => {
  it('ignores the liters of the first fill, which refilled km driven before tracking', () => {
    // 600 km, refilled by 30 + 36 L. The first 50 L must not count.
    const result = fuelConsumption([fill(1, 10_000, 50), fill(1, 10_300, 30), fill(1, 10_600, 36)]);
    expect(result).toEqual({ quantity: 66, distance: 600, per100: 11 });
  });

  it('works from 2 fills, and needs 2', () => {
    expect(fuelConsumption([fill(1, 1000, 40), fill(1, 1500, 30)]).per100).toBe(6);
    expect(fuelConsumption([fill(1, 1000, 40)]).per100).toBeNull();
    expect(fuelConsumption([]).per100).toBeNull();
  });

  it('sorts by odometer, not by input order', () => {
    expect(fuelConsumption([fill(1, 1500, 30), fill(1, 1000, 40)]).per100).toBe(6);
  });

  it('adds vehicles up, and skips a vehicle with a single fill', () => {
    const result = fuelConsumption([
      fill(1, 1000, 40),
      fill(1, 1500, 30),
      fill(2, 5000, 20),
      fill(2, 5500, 50),
      fill(3, 9000, 45),
    ]);
    expect(result).toEqual({ quantity: 80, distance: 1000, per100: 8 });
  });

  it('only uses fuel fills with an odometer and liters', () => {
    const result = fuelConsumption([
      fill(1, 1000, 40),
      { vehicle_id: 1, type: 'electric_charge', odometer: 1200, liters: null },
      { vehicle_id: 1, type: 'maintenance', odometer: 2000, liters: null },
      fill(1, null, 99),
      fill(1, 1500, 30),
    ]);
    expect(result).toEqual({ quantity: 30, distance: 500, per100: 6 });
  });
});

describe('electricConsumption', () => {
  const charge = (odometer: number, kwh: number | null) => ({
    vehicle_id: 1,
    type: 'electric_charge',
    odometer,
    kwh,
  });

  it('uses charges 2..n over the charge odometer range, ignoring fuel fills', () => {
    const result = electricConsumption([
      charge(1000, 30),
      fill(1, 1100, 40),
      charge(1200, 32),
      charge(1400, 28),
    ]);
    expect(result).toEqual({ quantity: 60, distance: 400, per100: 15 });
  });

  it('skips charges without kWh', () => {
    expect(electricConsumption([charge(1000, 30), charge(1200, null)]).per100).toBeNull();
  });
});

describe('formatVehicleConsumption', () => {
  it('uses the unit of the vehicle energy', () => {
    const values = { calculated_consumption: 6.1, calculated_consumption_kwh: 15.2 };
    expect(formatVehicleConsumption({ fuel_type: 'diesel', ...values })).toBe('6,1 L/100');
    expect(formatVehicleConsumption({ fuel_type: 'electric', ...values })).toBe('15,2 kWh/100');
    expect(formatVehicleConsumption({ fuel_type: 'plugin_hybrid', ...values })).toBe(
      '6,1 L/100 · 15,2 kWh/100',
    );
  });

  it('returns null when nothing is known', () => {
    expect(
      formatVehicleConsumption({ fuel_type: 'electric', calculated_consumption: 6 }),
    ).toBeNull();
    expect(formatVehicleConsumption({ fuel_type: 'gasoline' })).toBeNull();
  });
});
