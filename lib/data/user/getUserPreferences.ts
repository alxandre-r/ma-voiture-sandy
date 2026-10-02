import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { UserPreferences } from '@/types/userPreferences';

export const getUserPreferences = cache(async (): Promise<UserPreferences | null> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserPreferences(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return data as UserPreferences;
});
