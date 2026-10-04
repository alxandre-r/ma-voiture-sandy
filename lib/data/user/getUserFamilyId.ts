// SSR utilities for authentication and user profile retrieval

import { failLoad, NO_ROWS } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

export async function getUserFamilyId(): Promise<string | null> {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserFamilyId(demo.state);

  const supabase = await createSupabaseServerClient();

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  // No row: the user is not in a family
  if (error && error.code !== NO_ROWS) failLoad('votre famille', error);
  return data?.family_id ?? null;
}
