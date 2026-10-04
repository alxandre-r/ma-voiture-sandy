/**
 * Vehicle energy domain: `vehicles.fuel_type` codes, their French labels, and the
 * capabilities they imply.
 *
 * The DB stores codes (CHECK `vehicles_fuel_type_check`). The helpers also accept the
 * French labels written by older forms and demo journals, so legacy values still work.
 */

export const FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'plugin_hybrid', 'electric'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasoline: 'Essence',
  diesel: 'Diesel',
  hybrid: 'Hybride non rechargeable',
  plugin_hybrid: 'Hybride rechargeable',
  electric: 'Électrique',
};

const LEGACY_FUEL_TYPES: Record<string, FuelType> = {
  essence: 'gasoline',
  diesel: 'diesel',
  hybride: 'hybrid',
  'hybride non rechargeable': 'hybrid',
  'hybride rechargeable': 'plugin_hybrid',
  'plug-in-hybrid': 'plugin_hybrid',
  électrique: 'electric',
};

/**
 * Maps a stored or submitted value to its code.
 * Returns null when empty, and undefined when the value is not a known energy.
 */
export function normalizeFuelType(value: unknown): FuelType | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if ((FUEL_TYPES as readonly string[]).includes(key)) return key as FuelType;
  return LEGACY_FUEL_TYPES[key];
}

/** French label for display; an unknown value is shown as is. */
export function fuelTypeLabel(value: string | null | undefined): string | null {
  const code = normalizeFuelType(value);
  if (code) return FUEL_TYPE_LABELS[code];
  return value?.trim() || null;
}

/** Hybrids and EVs: their transmission is always automatic. */
export function isElectrified(value: string | null | undefined): boolean {
  const code = normalizeFuelType(value);
  return code === 'hybrid' || code === 'plugin_hybrid' || code === 'electric';
}

export interface VehicleEnergy {
  /** Can log fuel fills (liters) */
  fuel: boolean;
  /** Can log electric charges (kWh) */
  electric: boolean;
}

/** An unknown fuel type (null/empty) allows both energies; an unrecognised one is treated as fuel. */
export function vehicleEnergy(fuelType: string | null | undefined): VehicleEnergy {
  const code = normalizeFuelType(fuelType);
  if (code === null) return { fuel: true, electric: true };
  if (code === 'electric') return { fuel: false, electric: true };
  if (code === 'plugin_hybrid') return { fuel: true, electric: true };
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
