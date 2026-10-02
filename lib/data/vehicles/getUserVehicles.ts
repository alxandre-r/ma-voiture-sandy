// lib/data/vehicles/getUserVehicles.tsx
// SSR Fetch des véhicules de l'utilisateur.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

export const getUserVehicles = cache(async () => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserVehicles(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
});

export const getUserVehiclesMinimal = cache(async () => {
  const demo = await getDemoSession();
  if (demo) return demoData.getUserVehiclesMinimal(demo.state);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select(
      'vehicle_id, owner_id, owner_name, family_ids, name, make, model, year, odometer, color, fuel_type, status, permission_level',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
});
