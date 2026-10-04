import { cache } from 'react';

import { failLoad } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

/** Cached per request: getAllVehicles and the garage/insurance pages all need it. */
export const getUserFamilyIds = cache(async (): Promise<string[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserFamilyIds(demo.state);

  const supabase = await createSupabaseServerClient();

  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id);

  if (error) failLoad('vos familles', error);

  return data?.map((d) => d.family_id) ?? [];
});
