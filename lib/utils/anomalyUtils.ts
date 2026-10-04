/**
 * @file lib/utils/anomalyUtils.ts
 * @description Detects abnormal energy consumption using a rolling baseline.
 * For each vehicle with sufficient history, compares the latest fill's L/100km
 * (or the latest charge's kWh/100km for an EV) against the trailing average of
 * the previous ones and flags significant deviations.
 */

import { normalizeFuelType, vehicleEnergy } from '@/lib/utils/vehicleEnergy';

import type { Expense } from '@/types/expense';
import type { Vehicle } from '@/types/vehicle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalyEnergy = 'fuel' | 'electric';

export interface ConsumptionAnomaly {
  vehicleId: number;
  vehicleName: string;
  vehicleColor: string;
  /** Which consumption was analysed: L/100km (fuel) or kWh/100km (electric) */
  energy: AnomalyEnergy;
  /** Consumption of the latest fill/charge, in the unit of `energy` */
  latestConsumption: number;
  /** Rolling average of the previous fills/charges, in the unit of `energy` */
  baselineConsumption: number;
  /** Signed deviation in % (positive = higher than usual) */
  deviationPct: number;
  direction: 'up' | 'down';
  /** Date of the latest fill or charge */
  fillDate: string;
  possibleCauses: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum number of fills/charges (with odometer data) required to attempt analysis */
const MIN_FILLS = 6;

/** % deviation threshold above which a fill/charge is flagged */
const ANOMALY_THRESHOLD_PCT = 15;

/** Number of preceding fills/charges used to compute the baseline */
const BASELINE_WINDOW = 4;

const CAUSES: Record<AnomalyEnergy, Record<'up' | 'down', string[]>> = {
  fuel: {
    up: [
      'Conduite urbaine intense',
      'Pression des pneus insuffisante',
      'Filtre à air encrassé',
      'Usage intensif de la climatisation',
      'Températures froides',
    ],
    down: ['Conduite sur autoroute', 'Éco-conduite', 'Températures douces'],
  },
  electric: {
    up: [
      'Conduite à vitesse élevée (autoroute)',
      'Températures froides (batterie, chauffage)',
      'Pression des pneus insuffisante',
      'Usage intensif du chauffage ou de la climatisation',
      'Pertes à la recharge (recharge lente, par temps froid)',
    ],
    down: [
      'Conduite urbaine (freinage régénératif)',
      'Éco-conduite',
      'Températures douces',
      'Recharge non enregistrée',
    ],
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface EnergyPoint {
  date: string;
  odometer: number;
  /** Liters (fuel) or kWh (electric) */
  quantity: number;
}

/** Valid points (odometer + positive quantity) of one energy, sorted by date then odometer. */
function extractPoints(expenses: Expense[], energy: AnomalyEnergy): EnergyPoint[] {
  const points: EnergyPoint[] = [];
  for (const e of expenses) {
    const quantity = energy === 'fuel' ? e.liters : e.kwh;
    const type = energy === 'fuel' ? 'fuel' : 'electric_charge';
    if (e.type !== type || e.odometer == null || quantity == null || quantity <= 0) continue;
    points.push({ date: e.date, odometer: e.odometer, quantity });
  }
  return points.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.odometer - b.odometer,
  );
}

/**
 * Full-tank method: the quantity of point i covers the km since point i-1.
 * Index 0 is always null (no predecessor).
 */
function computeConsumptions(points: EnergyPoint[]): (number | null)[] {
  return points.map((p, i) => {
    if (i === 0) return null;
    const dist = p.odometer - points[i - 1].odometer;
    if (dist <= 0) return null;
    return (p.quantity / dist) * 100;
  });
}

/** Latest consumption vs the rolling baseline, or null when there is not enough data. */
function rollingDeviation(
  points: EnergyPoint[],
): { latest: number; baselineAvg: number; deviationPct: number } | null {
  if (points.length < MIN_FILLS) return null;

  const valid = computeConsumptions(points).filter((c): c is number => c !== null);
  if (valid.length < BASELINE_WINDOW + 1) return null;

  const latest = valid[valid.length - 1];
  const baseline = valid.slice(-(BASELINE_WINDOW + 1), -1);
  const baselineAvg = baseline.reduce((s, c) => s + c, 0) / baseline.length;
  if (baselineAvg <= 0) return null;

  return { latest, baselineAvg, deviationPct: ((latest - baselineAvg) / baselineAvg) * 100 };
}

/**
 * Energies whose consumption can be analysed for a vehicle.
 * A vehicle driven on both energies (PHEV) is skipped: its L/100 depends on the km
 * driven on electricity, and its kWh/100 on the km driven on fuel.
 * With an unknown fuel type, the logged expenses tell whether both energies are used.
 */
function analysableEnergies(vehicle: Vehicle | undefined, expenses: Expense[]): AnomalyEnergy[] {
  const fuelType = vehicle?.fuel_type;
  const energy = vehicleEnergy(fuelType);
  if (normalizeFuelType(fuelType) === 'plugin_hybrid') return [];

  const hasFuel = energy.fuel && expenses.some((e) => e.type === 'fuel');
  const hasCharge = energy.electric && expenses.some((e) => e.type === 'electric_charge');
  if (hasFuel && hasCharge) return [];
  if (hasFuel) return ['fuel'];
  if (hasCharge) return ['electric'];
  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse fill/charge expenses per vehicle and return anomalies where the latest
 * consumption deviates more than ANOMALY_THRESHOLD_PCT from the rolling baseline.
 *
 * Fuel vehicles are analysed in L/100km, EVs in kWh/100km; PHEVs are skipped.
 */
export function detectAnomalies(
  fillExpenses: Expense[],
  vehicles: Vehicle[],
): ConsumptionAnomaly[] {
  // Group fills and charges by vehicle
  const byVehicle = new Map<number, Expense[]>();
  for (const e of fillExpenses) {
    if (e.type !== 'fuel' && e.type !== 'electric_charge') continue;
    const arr = byVehicle.get(e.vehicle_id) ?? [];
    arr.push(e);
    byVehicle.set(e.vehicle_id, arr);
  }

  const anomalies: ConsumptionAnomaly[] = [];

  for (const [vehicleId, expenses] of byVehicle) {
    const vehicle = vehicles.find((v) => v.vehicle_id === vehicleId);

    for (const energy of analysableEnergies(vehicle, expenses)) {
      const points = extractPoints(expenses, energy);
      const result = rollingDeviation(points);
      if (!result || Math.abs(result.deviationPct) < ANOMALY_THRESHOLD_PCT) continue;

      const { latest, baselineAvg, deviationPct } = result;
      const direction = deviationPct > 0 ? 'up' : 'down';
      const vehicleName =
        (vehicle?.name ?? `${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`.trim()) ||
        `Véhicule ${vehicleId}`;

      anomalies.push({
        vehicleId,
        vehicleName,
        vehicleColor: vehicle?.color ?? '#6b7280',
        energy,
        latestConsumption: Math.round(latest * 10) / 10,
        baselineConsumption: Math.round(baselineAvg * 10) / 10,
        deviationPct: Math.round(deviationPct * 10) / 10,
        direction,
        fillDate: points[points.length - 1].date,
        possibleCauses: CAUSES[energy][direction],
      });
    }
  }

  return anomalies;
}
