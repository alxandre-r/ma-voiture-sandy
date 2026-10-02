import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the subset of the given vehicle IDs that have at least one active
 * insurance contract owned by the current user.
 * An active contract has no end_date (ongoing) or end_date >= today.
 */
export async function getActiveInsuranceVehicleIds(vehicleIds: number[]): Promise<number[]> {
  if (vehicleIds.length === 0) return [];

  const demo = await getDemoSession();
  if (demo) return demoData.getActiveInsuranceVehicleIds(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('insurance_contracts')
    .select('vehicle_id')
    .in('vehicle_id', vehicleIds)
    .eq('owner_id', user.id)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (error || !data) return [];

  return [...new Set(data.map((row: { vehicle_id: number }) => row.vehicle_id))];
}
