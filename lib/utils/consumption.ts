import { vehicleEnergy } from '@/lib/utils/vehicleEnergy';

/** Minimal expense shape: `Expense` rows and demo fills both fit. */
export interface EnergyPoint {
  vehicle_id: number;
  type: string;
  odometer?: number | null;
  liters?: number | null;
  kwh?: number | null;
}

export interface EnergyConsumption {
  /** Liters or kWh that refilled `distance` (each vehicle's first fill excluded) */
  quantity: number;
  distance: number;
  /** L/100 km or kWh/100 km, or null without at least 2 fills on one vehicle */
  per100: number | null;
}

const SOURCES = {
  fuel: { type: 'fuel', quantity: (p: EnergyPoint) => p.liters },
  electric: { type: 'electric_charge', quantity: (p: EnergyPoint) => p.kwh },
} as const;

/**
 * Full-tank method, per vehicle: the quantity of fills 2..n over (last − first odometer).
 * The first fill refilled km driven before the tracked range, so it doesn't count.
 * Same formula as `vehicles_for_display.calculated_consumption` (liters, roadmap P2.11) and
 * `calculated_consumption_kwh` (kWh, P2.12). For a PHEV the distance includes the km driven
 * on the other energy, so each value is per 100 km driven, not per 100 km on that energy.
 */
export function energyConsumption(
  points: readonly EnergyPoint[],
  energy: keyof typeof SOURCES,
): EnergyConsumption {
  const source = SOURCES[energy];
  const byVehicle = new Map<number, { odometer: number; quantity: number }[]>();
  for (const p of points) {
    const quantity = source.quantity(p);
    if (p.type !== source.type || !p.odometer || quantity == null) continue;
    const fills = byVehicle.get(p.vehicle_id) ?? [];
    fills.push({ odometer: p.odometer, quantity });
    byVehicle.set(p.vehicle_id, fills);
  }

  let quantity = 0;
  let distance = 0;
  for (const fills of byVehicle.values()) {
    if (fills.length < 2) continue;
    fills.sort((a, b) => a.odometer - b.odometer);
    distance += fills[fills.length - 1].odometer - fills[0].odometer;
    quantity += fills.slice(1).reduce((sum, f) => sum + f.quantity, 0);
  }

  return { quantity, distance, per100: distance > 0 ? (quantity / distance) * 100 : null };
}

/** L/100 km from fuel fills. */
export const fuelConsumption = (points: readonly EnergyPoint[]) =>
  energyConsumption(points, 'fuel');

/** kWh/100 km from electric charges. */
export const electricConsumption = (points: readonly EnergyPoint[]) =>
  energyConsumption(points, 'electric');

const formatPer100 = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Display text of a vehicle's consumption, in the unit(s) its energy uses:
 * "6,1 L/100", "15,2 kWh/100", or both for a PHEV. Null when nothing is known.
 */
export function formatVehicleConsumption(vehicle: {
  fuel_type?: string | null;
  calculated_consumption?: number | null;
  calculated_consumption_kwh?: number | null;
}): string | null {
  const energy = vehicleEnergy(vehicle.fuel_type);
  const parts = [
    energy.fuel && vehicle.calculated_consumption
      ? `${formatPer100(vehicle.calculated_consumption)} L/100`
      : null,
    energy.electric && vehicle.calculated_consumption_kwh
      ? `${formatPer100(vehicle.calculated_consumption_kwh)} kWh/100`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
