// lib/data/family/getFamilyInfo.tsx
// SSR fetch des informations de la famille via l'ID de famille de l'utilisateur.
// Utilisé dans family/page.tsx pour passer les infos aux composants enfants.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const getFamilyInfo = cache(async (familyId: string) => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyInfo(demo.state, familyId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('families')
    .select('id, name, created_at, owner_id, invite_token')
    .eq('id', familyId)
    .single();

  if (error) {
    console.error(`Failed to fetch family info: ${error.message}`);
    return null;
  }
  return data;
});
