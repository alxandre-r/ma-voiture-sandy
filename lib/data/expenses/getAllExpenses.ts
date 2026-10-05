// lib/data/expenses/getAllExpenses.ts
// SSR fetch des dépenses de tout type pour des véhicules ids.
// Utilisé dans dashboard/page.tsx pour afficher les dernières dépenses de l'utilisateur et de sa famille.

import { cache } from 'react';

import { fetchAllRows } from '@/lib/data/fetchAllRows';
import { failLoad } from '@/lib/data/loadError';
import { viewRows } from '@/lib/data/viewRows';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { Expense } from '@/types/expense';

export const getAllExpenses = cache(async (vehicleIds: number[]): Promise<Expense[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getAllExpenses(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await fetchAllRows((from, to) =>
    supabase
      .from('expenses_for_display')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to),
  );

  if (error) failLoad('les dépenses', error);
  return viewRows<Expense>(data);
});
