// lib/data/user/getCurrentUserInfo.tsx
// SSR Fetch des informations de l'utilisateur connecté depuis la vue "users_info" pour les pages nécessitant des données utilisateur.

import { cache } from 'react';

import { failLoad, NO_ROWS } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import { viewRow } from '@/lib/data/viewRows';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { User } from '@/types/user';

// Using React's cache() for proper intra-request memoization
// Note: React cache() works with dynamic data (cookies) unlike unstable_cache
export const getCurrentUserInfo = cache(async (): Promise<User | null> => {
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
    // No profile row: treated like no session (AppDataProvider redirects)
    if (error?.code === NO_ROWS) return null;
    if (error) failLoad('votre profil', error);
    return viewRow<User>(data);
  } catch (err) {
    // A DB failure must reach error.tsx, not look like an expired session
    if (err instanceof Error && err.message.startsWith('Impossible de charger')) throw err;
    // AuthApiError (e.g. 429 rate limit) and network errors on the auth call
    return null;
  }
});
