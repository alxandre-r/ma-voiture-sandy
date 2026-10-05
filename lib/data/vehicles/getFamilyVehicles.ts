// lib/data/vehicles/getFamilyVehicles.tsx
// SSR Fetch des véhicules des membres de la famille de l'utilisateur.

import { cache } from 'react';

import { failLoad } from '@/lib/data/loadError';
import { getCurrentUser } from '@/lib/data/user/getCurrentUser';
import { viewRows } from '@/lib/data/viewRows';
import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';

import { createSupabaseServerClient } from '../../supabase/server';

import type { FamilyVehicleSummary, Vehicle, VehicleMinimal } from '@/types/vehicle';

export const getFamilyVehicles = cache(async (familyId?: string): Promise<Vehicle[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyVehicles(demo.state, familyId);

  const supabase = await createSupabaseServerClient();

  if (!familyId) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vehicles_for_display')
    .select('*')
    .contains('family_ids', [familyId])
    .neq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    failLoad('les véhicules de la famille', error);
  }

  return viewRows<Vehicle>(data);
});

// Tous les véhicules de la famille pour affichage (incluant les véhicules de l'utilisateur courant)
export const getFamilyAllVehicles = cache(
  async (familyId?: string): Promise<FamilyVehicleSummary[]> => {
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
      failLoad('les véhicules de la famille', error);
    }

    return viewRows<FamilyVehicleSummary>(data);
  },
);

export const getFamilyVehiclesMinimal = cache(
  async (familyId?: string): Promise<VehicleMinimal[]> => {
    const demo = await getDemoSession();
    if (demo) return demoData.getFamilyVehiclesMinimal(demo.state, familyId);

    const supabase = await createSupabaseServerClient();

    if (!familyId) return [];

    const user = await getCurrentUser();
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
      failLoad('les véhicules de la famille', error);
    }

    return viewRows<VehicleMinimal>(data);
  },
);
