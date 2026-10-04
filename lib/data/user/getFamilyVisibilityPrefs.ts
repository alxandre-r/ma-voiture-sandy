import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { FamilyVisibilityPrefs } from '@/types/userPreferences';

/**
 * Visibility flags (show_*) of family members, by user id (P3.11). One RPC call: RLS hides other
 * users' user_preferences rows, so get_family_visibility_prefs (SECURITY DEFINER, family members
 * only) returns just these four flags. Secondary data (lib/data/loadError.ts): on error, log and
 * return {} — the pages then show everything, as they did before.
 */
const loadByKey = cache(async (key: string): Promise<Record<string, FamilyVisibilityPrefs>> => {
  const userIds = key ? key.split(',') : [];
  if (userIds.length === 0) return {};

  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyVisibilityPrefs(demo.state, userIds);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_family_visibility_prefs', {
    p_user_ids: userIds,
  });
  if (error) {
    console.error('[lib/data] Préférences de visibilité indisponibles:', error);
    return {};
  }

  const prefs: Record<string, FamilyVisibilityPrefs> = {};
  for (const { user_id, ...flags } of (data ?? []) as (FamilyVisibilityPrefs & {
    user_id: string;
  })[]) {
    prefs[user_id] = flags;
  }
  return prefs;
});

/** React cache() compares arguments by reference: key by the sorted ids so callers share one call. */
export function getFamilyVisibilityPrefs(
  userIds: string[],
): Promise<Record<string, FamilyVisibilityPrefs>> {
  return loadByKey([...new Set(userIds)].sort().join(','));
}
