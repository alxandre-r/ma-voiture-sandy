import { cache } from 'react';

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
export const getReminders = cache(async (vehicleIds: number[] = []): Promise<Reminder[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getReminders(demo.state, vehicleIds);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase.from('reminders').select('*');

  if (vehicleIds.length > 0) {
    // Own reminders (any vehicle) + family members' reminders on accessible vehicles
    query = query.or(`user_id.eq.${user.id},vehicle_id.in.(${vehicleIds.join(',')})`);
  } else {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }

  return (data as Reminder[]) ?? [];
});

/**
 * Fetch reminders for a specific vehicle.
 */
export const getVehicleReminders = cache(async (vehicleId: number): Promise<Reminder[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getVehicleReminders(demo.state, vehicleId);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('vehicle_id', vehicleId)
    .eq('is_completed', false)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching vehicle reminders:', error);
    return [];
  }

  return (data as Reminder[]) ?? [];
});
