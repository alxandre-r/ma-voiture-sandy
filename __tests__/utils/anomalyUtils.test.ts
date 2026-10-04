import { detectAnomalies } from '@/lib/utils/anomalyUtils';

import type { Expense } from '@/types/expense';
import type { Vehicle } from '@/types/vehicle';

/**
 * Creates a minimal fuel expense with the fields required for anomaly detection.
 * dateOffset is an integer number of months from a fixed base date.
 */
function makeFuelFill(
  id: number,
  vehicleId: number,
  monthOffset: number,
  odometer: number,
  liters: number,
): Expense {
  const d = new Date('2025-01-01');
  d.setMonth(d.getMonth() + monthOffset);
  return {
    id,
    vehicle_id: vehicleId,
    vehicle_name: null,
    owner_id: 'user-1',
    owner_name: null,
    type: 'fuel',
    amount: liters * 1.8,
    date: d.toISOString().split('T')[0],
    notes: null,
    odometer,
    label: null,
    maintenance_type: null,
    maintenance_type_label: null,
    garage: null,
    liters,
    price_per_liter: 1.8,
  };
}

function makeVehicle(id: number, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    vehicle_id: id,
    name: `Car ${id}`,
    make: 'Toyota',
    model: 'Corolla',
    color: '#ff0000',
    last_fill_date: null,
    ...overrides,
  };
}

/**
 * Builds 6 fills for a vehicle with consistent consumption.
 * Each fill covers 1000 km.
 *
 * With 6 fill points: consumptions = [null, c1..c5] → valid = [c1..c5] (5 values)
 * → satisfies MIN_FILLS=6 and BASELINE_WINDOW+1=5.
 *
 * lastLiters overrides the 6th fill's liters to simulate an anomaly.
 */
function makeNormalFills(vehicleId: number, lastLiters = 70): Expense[] {
  return [
    makeFuelFill(vehicleId * 10 + 1, vehicleId, 0, 10000, 70),
    makeFuelFill(vehicleId * 10 + 2, vehicleId, 1, 11000, 70),
    makeFuelFill(vehicleId * 10 + 3, vehicleId, 2, 12000, 70),
    makeFuelFill(vehicleId * 10 + 4, vehicleId, 3, 13000, 70),
    makeFuelFill(vehicleId * 10 + 5, vehicleId, 4, 14000, 70),
    makeFuelFill(vehicleId * 10 + 6, vehicleId, 5, 15000, lastLiters),
  ];
}

const vehicle1 = makeVehicle(1);

describe('detectAnomalies', () => {
  it('returns empty array for empty fills', () => {
    expect(detectAnomalies([], [vehicle1])).toEqual([]);
  });

  it('returns no anomaly for a single fill (below MIN_FILLS=6)', () => {
    const fills = [makeFuelFill(1, 1, 0, 10000, 70)];
    expect(detectAnomalies(fills, [vehicle1])).toHaveLength(0);
  });

  it('returns no anomaly for 5 fills (below MIN_FILLS=6)', () => {
    const fills = makeNormalFills(1).slice(0, 5);
    expect(detectAnomalies(fills, [vehicle1])).toHaveLength(0);
  });

  it('returns no anomaly when consumption is within the 15% threshold', () => {
    // All fills at 7 L/100km (70L / 1000km) → deviation = 0%
    const fills = makeNormalFills(1, 70);
    expect(detectAnomalies(fills, [vehicle1])).toHaveLength(0);
  });

  it("detects 'up' anomaly when latest consumption is >15% above baseline", () => {
    // Baseline: 7 L/100km. Latest: 9/1000*100 = 9 L/100km → deviation ≈ +28.6%
    const fills = makeNormalFills(1, 90);
    const anomalies = detectAnomalies(fills, [vehicle1]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].direction).toBe('up');
    expect(anomalies[0].vehicleId).toBe(1);
    expect(anomalies[0].deviationPct).toBeGreaterThan(15);
  });

  it("detects 'down' anomaly when latest consumption is >15% below baseline", () => {
    // Baseline: 7 L/100km. Latest: 5/1000*100 = 5 L/100km → deviation ≈ -28.6%
    const fills = makeNormalFills(1, 50);
    const anomalies = detectAnomalies(fills, [vehicle1]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].direction).toBe('down');
    expect(anomalies[0].deviationPct).toBeLessThan(-15);
  });

  it('handles multiple vehicles independently', () => {
    const vehicle2 = makeVehicle(2);
    const fillsV1 = makeNormalFills(1, 70); // normal — no anomaly
    const fillsV2 = makeNormalFills(2, 90); // anomaly
    const anomalies = detectAnomalies([...fillsV1, ...fillsV2], [vehicle1, vehicle2]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].vehicleId).toBe(2);
  });

  it('ignores non-fuel expenses', () => {
    const maintenance: Expense = {
      ...makeFuelFill(99, 1, 0, 10000, 70),
      type: 'maintenance',
      liters: undefined,
    };
    const fills = [...makeNormalFills(1, 90), maintenance];
    const anomalies = detectAnomalies(fills, [vehicle1]);
    // maintenance is ignored; anomaly still detected for vehicle 1
    expect(anomalies).toHaveLength(1);
  });

  it('uses vehicle name from vehicles list', () => {
    const namedVehicle = makeVehicle(1, { name: 'Mon Kangoo' });
    const fills = makeNormalFills(1, 90);
    const anomalies = detectAnomalies(fills, [namedVehicle]);
    expect(anomalies[0].vehicleName).toBe('Mon Kangoo');
  });
});

/** Electric charge with the fields used by the kWh/100km check (liters null, price_per_liter 0 like real rows). */
function makeCharge(
  id: number,
  vehicleId: number,
  monthOffset: number,
  odometer: number,
  kwh: number,
): Expense {
  return {
    ...makeFuelFill(id, vehicleId, monthOffset, odometer, 0),
    type: 'electric_charge',
    amount: kwh * 0.25,
    liters: null,
    price_per_liter: 0,
    kwh,
    price_per_kwh: 0.25,
    charge_type: 'charge',
  };
}

/** 6 charges, 1000 km apart, 170 kWh each (17 kWh/100km); lastKwh overrides the 6th. */
function makeNormalCharges(vehicleId: number, lastKwh = 170): Expense[] {
  return [0, 1, 2, 3, 4, 5].map((i) =>
    makeCharge(vehicleId * 10 + i + 1, vehicleId, i, 10000 + i * 1000, i === 5 ? lastKwh : 170),
  );
}

describe('detectAnomalies — energy types', () => {
  it('marks fuel anomalies with energy "fuel"', () => {
    const anomalies = detectAnomalies(makeNormalFills(1, 90), [vehicle1]);
    expect(anomalies[0].energy).toBe('fuel');
  });

  it('skips the L/100 check for a plug-in hybrid', () => {
    const phev = makeVehicle(1, { fuel_type: 'plugin_hybrid' });
    expect(detectAnomalies(makeNormalFills(1, 90), [phev])).toHaveLength(0);
  });

  it('skips the kWh/100 check for a plug-in hybrid', () => {
    const phev = makeVehicle(1, { fuel_type: 'plugin_hybrid' });
    expect(detectAnomalies(makeNormalCharges(1, 260), [phev])).toHaveLength(0);
  });

  it('still analyses a non-rechargeable hybrid in L/100', () => {
    const hybrid = makeVehicle(1, { fuel_type: 'hybrid' });
    expect(detectAnomalies(makeNormalFills(1, 90), [hybrid])).toHaveLength(1);
  });

  it('detects a kWh/100 anomaly for an EV', () => {
    const ev = makeVehicle(1, { fuel_type: 'electric' });
    // Baseline 17 kWh/100km, latest 26 kWh/100km → ≈ +53%
    const anomalies = detectAnomalies(makeNormalCharges(1, 260), [ev]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      vehicleId: 1,
      energy: 'electric',
      direction: 'up',
      latestConsumption: 26,
      baselineConsumption: 17,
    });
    expect(anomalies[0].possibleCauses.join(' ')).not.toMatch(/carburant|filtre à air/i);
  });

  it('does not flag an EV with stable kWh/100', () => {
    const ev = makeVehicle(1, { fuel_type: 'electric' });
    expect(detectAnomalies(makeNormalCharges(1, 175), [ev])).toHaveLength(0);
  });

  it('does not run the kWh check on a fuel-only vehicle', () => {
    const car = makeVehicle(1, { fuel_type: 'gasoline' });
    expect(detectAnomalies(makeNormalCharges(1, 260), [car])).toHaveLength(0);
  });

  it('skips a vehicle of unknown energy that logs both fills and charges', () => {
    const unknown = makeVehicle(1, { fuel_type: null });
    const expenses = [...makeNormalFills(1, 90), ...makeNormalCharges(1, 260)];
    expect(detectAnomalies(expenses, [unknown])).toHaveLength(0);
  });
});
