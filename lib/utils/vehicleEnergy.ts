/**
 * Energy capabilities of a vehicle, derived from `vehicles.fuel_type`.
 *
 * Accepts both the DB codes (`gasoline`, `diesel`, `hybrid`, `plugin_hybrid`, `electric`)
 * and the legacy French labels written by `VehicleForm` and the demo seed (roadmap P2.0).
 * An unknown fuel type (null/empty) allows both energies.
 */
export interface VehicleEnergy {
  /** Can log fuel fills (liters) */
  fuel: boolean;
  /** Can log electric charges (kWh) */
  electric: boolean;
}

const ELECTRIC_ONLY = new Set(['electric', 'électrique']);
const PLUGIN_HYBRID = new Set(['plugin_hybrid', 'plug-in-hybrid', 'hybride rechargeable']);

export function vehicleEnergy(fuelType: string | null | undefined): VehicleEnergy {
  const value = fuelType?.trim().toLowerCase();
  if (!value) return { fuel: true, electric: true };
  if (ELECTRIC_ONLY.has(value)) return { fuel: false, electric: true };
  if (PLUGIN_HYBRID.has(value)) return { fuel: true, electric: true };
  return { fuel: true, electric: false };
}

/** Default operation for a new fill: a charge only for vehicles that cannot take fuel. */
export function defaultChargeType(fuelType: string | null | undefined): 'fill' | 'charge' {
  return vehicleEnergy(fuelType).fuel ? 'fill' : 'charge';
}

/**
 * Server-side check of a fill/charge against its vehicle (roadmap P2.10).
 * Returns the French error message to answer with a 400, or null when valid.
 */
export function fillInputError(
  fuelType: string | null | undefined,
  chargeType: 'fill' | 'charge',
  amount: unknown,
): string | null {
  const energy = vehicleEnergy(fuelType);
  if (chargeType === 'charge' && !energy.electric) {
    return "Ce véhicule n'accepte pas les recharges électriques";
  }
  if (chargeType === 'fill' && !energy.fuel) {
    return "Ce véhicule n'accepte pas les pleins de carburant";
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 'Veuillez entrer un montant valide';
  return null;
}
