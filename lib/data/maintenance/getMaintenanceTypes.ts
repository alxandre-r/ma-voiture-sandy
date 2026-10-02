import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MaintenanceTypeInfo {
  label_fr: string;
  interval_km: number | null;
  interval_months: number | null;
}

export const getMaintenanceTypes = cache(async function getMaintenanceTypes(): Promise<
  Record<string, MaintenanceTypeInfo>
> {
  const demo = await getDemoSession();
  if (demo) return demoData.getMaintenanceTypes(demo.state);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('maintenance_types')
    .select('id, label_fr, interval_km, interval_months');

  if (error) {
    console.error('Error fetching maintenance types:', error);
    return {};
  }

  return Object.fromEntries(
    (data || []).map((row) => [
      row.id,
      {
        label_fr: row.label_fr,
        interval_km: row.interval_km,
        interval_months: row.interval_months,
      },
    ]),
  );
});
