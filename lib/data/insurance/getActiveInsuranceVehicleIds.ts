import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the subset of the given vehicle IDs that have at least one active insurance contract,
 * whoever holds it (a family vehicle insured by its owner counts as insured).
 * Callers only pass vehicles the user can access. Active = no end_date or end_date >= today.
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
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (error || !data) return [];

  return [...new Set(data.map((row: { vehicle_id: number }) => row.vehicle_id))];
}
