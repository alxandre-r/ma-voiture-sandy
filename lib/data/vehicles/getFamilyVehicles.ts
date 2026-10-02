// lib/data/vehicles/getFamilyVehicles.tsx
// SSR Fetch des véhicules des membres de la famille de l'utilisateur.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

export const getFamilyVehicles = cache(async (familyId?: string) => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyVehicles(demo.state, familyId);

  const supabase = await createSupabaseServerClient();

  if (!familyId) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select('*')
    .contains('family_ids', [familyId])
    .neq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
});

// Tous les véhicules de la famille pour affichage (incluant les véhicules de l'utilisateur courant)
export const getFamilyAllVehicles = cache(async (familyId?: string) => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyAllVehicles(demo.state, familyId);

  const supabase = await createSupabaseServerClient();

  if (!familyId) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select('vehicle_id, owner_id, owner_name, make, model, year, image, name, permission_level')
    .contains('family_ids', [familyId])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
});

export const getFamilyVehiclesMinimal = cache(async (familyId?: string) => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyVehiclesMinimal(demo.state, familyId);

  const supabase = await createSupabaseServerClient();

  if (!familyId) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select(
      'vehicle_id, owner_id, owner_name, family_ids, name, make, model, year, odometer, color, fuel_type, status, permission_level',
    )
    .contains('family_ids', [familyId])
    .neq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vehicles: ${error.message}`);
  }

  return data;
});
