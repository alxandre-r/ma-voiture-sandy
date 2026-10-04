// lib/data/user/getCurrentUserInfo.tsx
// SSR Fetch des informations de l'utilisateur connecté depuis la vue "users_info" pour les pages nécessitant des données utilisateur.

import { cache } from 'react';

import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Using React's cache() for proper intra-request memoization
// Note: React cache() works with dynamic data (cookies) unlike unstable_cache
export const getCurrentUserInfo = cache(async () => {
  const demo = await getDemoSession();
  if (demo) return demoData.getCurrentUserInfo(demo.state);

  try {
    const supabase = await createSupabaseServerClient();

    // Rate limit or other auth API errors: getCurrentUser() returns null
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users_info')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Failed to fetch user info:', error.message);
      return null;
    }
    return data;
  } catch {
    // Catches AuthApiError (e.g. 429 rate limit) and any network errors
    return null;
  }
});
