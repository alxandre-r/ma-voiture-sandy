import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface FamilyInfo {
  id: string;
  name: string;
}

/** Returns the list of families the current user belongs to (id + name). */
export const getUserFamilies = cache(async (): Promise<FamilyInfo[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserFamilies(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('family_members')
    .select('families(id, name)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to fetch user families:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const f = row.families as unknown as { id: string; name: string } | null;
      return f;
    })
    .filter((f): f is FamilyInfo => f !== null);
});
