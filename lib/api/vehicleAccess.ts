/**
 * @file lib/api/vehicleAccess.ts
 * @description Write-access rules shared by the API routes (P3.9). RLS enforces the same rules
 * in the DB (has_vehicle_permission() includes the vehicle owner since 2026-10-04-05); these
 * checks give the user a clear 403 instead of a silent no-op.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** The vehicle owner, or a user with a `write` permission on it. */
export async function canWriteVehicle(
  supabase: SupabaseClient,
  vehicleId: number | string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('vehicles_for_display')
    .select('owner_id, permission_level')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();
  return !!data && (data.owner_id === userId || data.permission_level === 'write');
}

/** An existing row (expense, contract…) is editable by its creator or by whoever can write its vehicle. */
export async function canWriteRow(
  supabase: SupabaseClient,
  row: { owner_id: string; vehicle_id: number | string | null },
  userId: string,
): Promise<boolean> {
  if (row.owner_id === userId) return true;
  return row.vehicle_id != null && canWriteVehicle(supabase, row.vehicle_id, userId);
}
