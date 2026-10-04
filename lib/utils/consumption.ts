/** Minimal expense shape: `Expense` rows and demo fills both fit. */
export interface FuelPoint {
  vehicle_id: number;
  type: string;
  odometer?: number | null;
  liters?: number | null;
}

export interface FuelConsumption {
  /** Liters that refilled `distance` (each vehicle's first fill excluded) */
  liters: number;
  distance: number;
  /** L/100 km, or null without at least 2 fills on one vehicle */
  per100: number | null;
}

/**
 * Full-tank method, per vehicle: the liters of fills 2..n over (last − first odometer).
 * The first fill refilled km driven before the tracked range, so its liters don't count.
 * Same formula as `vehicles_for_display.calculated_consumption` (roadmap P2.11).
 */
export function fuelConsumption(points: readonly FuelPoint[]): FuelConsumption {
  const byVehicle = new Map<number, { odometer: number; liters: number }[]>();
  for (const p of points) {
    if (p.type !== 'fuel' || !p.odometer || p.liters == null) continue;
    const fills = byVehicle.get(p.vehicle_id) ?? [];
    fills.push({ odometer: p.odometer, liters: p.liters });
    byVehicle.set(p.vehicle_id, fills);
  }

  let liters = 0;
  let distance = 0;
  for (const fills of byVehicle.values()) {
    if (fills.length < 2) continue;
    fills.sort((a, b) => a.odometer - b.odometer);
    distance += fills[fills.length - 1].odometer - fills[0].odometer;
    liters += fills.slice(1).reduce((sum, f) => sum + f.liters, 0);
  }

  return { liters, distance, per100: distance > 0 ? (liters / distance) * 100 : null };
}
