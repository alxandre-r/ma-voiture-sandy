import { describe, expect, it } from 'vitest';

import { fuelConsumption } from '@/lib/utils/consumption';

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
    expect(result).toEqual({ liters: 66, distance: 600, per100: 11 });
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
    expect(result).toEqual({ liters: 80, distance: 1000, per100: 8 });
  });

  it('only uses fuel fills with an odometer and liters', () => {
    const result = fuelConsumption([
      fill(1, 1000, 40),
      { vehicle_id: 1, type: 'electric_charge', odometer: 1200, liters: null },
      { vehicle_id: 1, type: 'maintenance', odometer: 2000, liters: null },
      fill(1, null, 99),
      fill(1, 1500, 30),
    ]);
    expect(result).toEqual({ liters: 30, distance: 500, per100: 6 });
  });
});
