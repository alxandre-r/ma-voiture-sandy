import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { UserPreferences } from '@/types/userPreferences';

export const getPreferencesByUserId = cache(
  async (userId: string): Promise<UserPreferences | null> => {
    const demo = await getDemoSession();
    if (demo) return demoData.getPreferencesByUserId(demo.state, userId);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as UserPreferences;
  },
);
