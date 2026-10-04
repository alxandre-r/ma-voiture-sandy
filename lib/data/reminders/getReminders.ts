import { cache } from 'react';

import { failLoad } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { Reminder } from '@/types/reminder';

/**
 * Fetch reminders for the authenticated user and all accessible vehicles (incl. family).
 * Fetches own reminders + reminders attached to any of the provided vehicle IDs.
 * Includes completed reminders so the client can filter as needed.
 * Wrapped in React cache() for request-level deduplication.
 */
const REMINDER_SELECT = '*, source_expense:expenses!reminders_source_expense_id_fkey(id, date)';

export const getReminders = cache(async (vehicleIds: number[] = []): Promise<Reminder[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getReminders(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();

  const user = await getCurrentUser();

  if (!user) return [];

  // The source maintenance of automatic reminders, for the « créé depuis l'entretien » link
  let query = supabase.from('reminders').select(REMINDER_SELECT);

  if (vehicleIds.length > 0) {
    // Own reminders (any vehicle) + family members' reminders on accessible vehicles
    query = query.or(`user_id.eq.${user.id},vehicle_id.in.(${vehicleIds.join(',')})`);
  } else {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) failLoad('les rappels', error);

  return (data as Reminder[]) ?? [];
});

/**
 * Fetch reminders for a specific vehicle.
 */
export const getVehicleReminders = cache(async (vehicleId: number): Promise<Reminder[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getVehicleReminders(demo.state, vehicleId);

  const supabase = await createSupabaseServerClient();

  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .eq('is_completed', false)
    .order('due_date', { ascending: true });

  if (error) failLoad('les rappels du véhicule', error);

  return (data as Reminder[]) ?? [];
});
