import { failLoad } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import { getFamilyVisibilityPrefs } from '@/lib/data/user/getFamilyVisibilityPrefs';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sortByStartDesc } from '@/lib/utils/insuranceUtils';

import type { Attachment } from '@/types/attachment';
import type { InsuranceContract, InsuranceData, InsuranceVehicleRef } from '@/types/insurance';

/**
 * Every contract of the given vehicles that the user may see, with attachments.
 * Family vehicles whose owner disabled `show_insurance` are listed in hiddenVehicleIds
 * and their contracts are not returned.
 */
export async function getInsuranceData(vehicles: InsuranceVehicleRef[]): Promise<InsuranceData> {
  const empty: InsuranceData = { contracts: [], hiddenVehicleIds: [] };
  if (vehicles.length === 0) return empty;

  const demo = await getDemoSession();
  if (demo) return demoData.getInsuranceData(demo.state, vehicles);

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return empty;

  const otherOwnerIds = [
    ...new Set(
      vehicles.map((v) => v.owner_id).filter((id): id is string => !!id && id !== user.id),
    ),
  ];
  const prefs = await getFamilyVisibilityPrefs(otherOwnerIds);
  const hiddenOwners = new Set(otherOwnerIds.filter((id) => prefs[id]?.show_insurance === false));
  const hiddenVehicleIds = vehicles
    .filter((v) => v.owner_id && hiddenOwners.has(v.owner_id))
    .map((v) => v.vehicle_id);
  const visibleIds = vehicles
    .map((v) => v.vehicle_id)
    .filter((id) => !hiddenVehicleIds.includes(id));
  if (visibleIds.length === 0) return { contracts: [], hiddenVehicleIds };

  const { data: contracts, error } = await supabase
    .from('insurance_contracts')
    .select('*')
    .in('vehicle_id', visibleIds)
    .order('start_date', { ascending: false });
  if (error) failLoad("les contrats d'assurance", error);
  if (!contracts) return { contracts: [], hiddenVehicleIds };

  const contractIds = (contracts as InsuranceContract[]).map((c) => c.id);
  const { data: attachments } = contractIds.length
    ? await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'insurance_contract')
        .eq('is_deleted', false)
        .in('entity_id', contractIds)
    : { data: [] as Attachment[] };

  return {
    contracts: sortByStartDesc(
      (contracts as InsuranceContract[]).map((c) => ({
        ...c,
        // numeric columns may come back as strings
        monthly_cost: Number(c.monthly_cost),
        attachments: ((attachments ?? []) as Attachment[]).filter((a) => a.entity_id === c.id),
      })),
    ),
    hiddenVehicleIds,
  };
}
