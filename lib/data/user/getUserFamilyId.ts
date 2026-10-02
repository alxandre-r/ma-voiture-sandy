// SSR utilities for authentication and user profile retrieval

'use server';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

export async function getUserFamilyId(): Promise<string | null> {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserFamilyId(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (data && data.family_id) {
    return data.family_id;
  } else if (error && error.code !== 'PGRST116') {
    // PGRST116 = No rows found, which is expected if the user is not in a family
    console.error('Error fetching family ID:', error);
  }

  return null;
}
