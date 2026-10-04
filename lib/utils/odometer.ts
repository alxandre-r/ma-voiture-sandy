import type { SupabaseClient } from '@supabase/supabase-js';

/** Error shown when a fill has no usable odometer (fills.odometer is NOT NULL). */
export const ODOMETER_REQUIRED = 'Veuillez entrer le kilométrage';

/** A fill odometer: a whole number of km above 0, or null when missing or invalid. */
export function parseOdometer(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.trim() || NaN) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Moves `vehicles.odometer` forward only. A single `UPDATE … WHERE odometer < value`, so a
 * backdated fill or maintenance never lowers it (roadmap P2.9). RLS enforces write access.
 */
export async function raiseVehicleOdometer(
  supabase: SupabaseClient,
  vehicleId: number,
  odometer: number,
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ odometer })
    .eq('id', vehicleId)
    .lt('odometer', odometer);
  if (error) console.error('Error updating vehicle odometer:', error);
}
