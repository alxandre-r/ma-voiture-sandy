/**
 * @file lib/data/maintenance/getMaintenanceExpenses.ts
 * @fileoverview Server-side function to fetch maintenance expenses directly from the database.
 */

import { cache } from 'react';

import { fetchAllRows } from '@/lib/data/fetchAllRows';
import { failLoad } from '@/lib/data/loadError';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { Expense } from '@/types/expense';

/**
 * Fetch maintenance expenses from the expenses_for_display view.
 * This is used for SSR streaming - the data is fetched on the server
 * and passed to the client component.
 *
 * @param vehicleIds - Array of vehicle IDs to filter by. If empty, returns all maintenance expenses.
 * @returns Array of maintenance expense records.
 */
export const getMaintenanceExpenses = cache(async function getMaintenanceExpenses(
  vehicleIds: number[] = [],
): Promise<Expense[]> {
  const demo = await getDemoSession();
  if (demo) return demoData.getMaintenanceExpenses(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();

  const { data: expenses, error } = await fetchAllRows((from, to) => {
    let query = supabase
      .from('expenses_for_display')
      .select('*')
      .eq('type', 'maintenance')
      .order('date', { ascending: false })
      .order('id', { ascending: false });
    if (vehicleIds.length > 0) query = query.in('vehicle_id', vehicleIds);
    return query.range(from, to);
  });

  if (error) failLoad('les entretiens', error);

  return expenses || [];
});
