// lib/data/expenses/getMaintenanceExpense.ts
// SSR fetch des dépenses de type "maintenance" pour des véhicules ids.
// Utilisé dans maintenance/page.tsx pour afficher les dépenses d'entretien de l'utilisateur et de sa famille.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const getMaintenanceExpenses = cache(async (vehicleIds: number[]) => {
  const demo = await getDemoSession();
  if (demo) {
    // demoData treats an empty list as 'all'; this fetcher's real query returns nothing for it
    return vehicleIds.length === 0 ? [] : demoData.getMaintenanceExpenses(demo.state, vehicleIds);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('expenses_for_display')
    .select('*')
    .in('vehicle_id', vehicleIds)
    .eq('type', 'maintenance')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance expenses:', error);
    return null;
  }

  return data;
});
