// lib/data/user/getCurrentUser.ts
// The signed-in user for this request: ONE Supabase Auth round-trip per render, shared by every
// lib/data fetcher through React cache() (P3.15); each fetcher used to call auth.getUser() itself.

import { cache } from 'react';

import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  // The demo has no Supabase auth user
  if (await getDemoSession()) return null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return user;
});
