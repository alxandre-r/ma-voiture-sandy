// lib/data/expenses/getFillExpenses.ts
// SSR fetch des pleins et recharges (date croissante) pour estimer les rappels au kilométrage.
// Utilisé dans reminders/page.tsx.

import { cache } from 'react';

import { fetchAllRows } from '@/lib/data/fetchAllRows';
import { failLoad } from '@/lib/data/loadError';
import { viewRows } from '@/lib/data/viewRows';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { Expense } from '@/types/expense';

/** Only the fields needed for the km/month estimate are selected. */
export const getFillExpenses = cache(async (vehicleIds: number[]): Promise<Expense[]> => {
  if (vehicleIds.length === 0) return [];
  const demo = await getDemoSession();
  if (demo) return demoData.getFillExpenses(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from('expenses_for_display')
      .select('vehicle_id, type, date, odometer')
      .in('vehicle_id', vehicleIds)
      .in('type', ['fuel', 'electric_charge'])
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  if (error) failLoad('les pleins', error);

  return viewRows<Expense>(data);
});
