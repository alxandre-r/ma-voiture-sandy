// lib/data/user/getUserInfo.tsx
// SSR Fetch des informations de l'utilisateur depuis la vue "users_info" pour les pages nécessitant des données utilisateur.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

export const getUserInfo = cache(async () => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserInfo(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.from('users_info').select('*').eq('id', user.id).single();

  if (error) {
    throw new Error(`Failed to fetch user info: ${error.message}`);
  }

  return data;
});
