/**
 * @file app/api/vehicles/update/route.tsx
 * @fileoverview API route to update an existing vehicle.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { dbErrorResponse } from '@/lib/api/dbErrors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeFuelType } from '@/lib/utils/vehicleEnergy';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';
import { vehicleFieldsError } from '@/lib/validation/vehicle';

import type { Vehicle } from '@/types/vehicle';

const VALID_FIELDS = [
  'name',
  'owner',
  'make',
  'model',
  'year',
  'fuel_type',
  'manufacturer_consumption',
  'odometer',
  'color',
  'plate',
  'last_fill',
  // New fields
  'status',
  'vin',
  'transmission',
  'image',
  'tech_control_expiry',
  'financing_mode',
  'purchase_date',
  'purchase_price',
  'co2_emission',
];

// Helper to convert empty strings to null for date fields
const toDate = (value: string | undefined | null) => {
  if (!value || value === '') return null;
  return value;
};

// Helper to convert empty strings to null for numeric fields
const toNumber = (value: number | undefined | null) => {
  if (value === undefined || value === null) return null;
  return value;
};

// Helper to convert to uppercase (for plate and VIN)
const toUpperCase = (value: string | undefined | null) => {
  if (!value) return null;
  return value.toUpperCase();
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Auth user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - utilisateur non connecté' },
        { status: 401 },
      );
    }

    // Parse body
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const { vehicle_id: id, ...inputData } = body;

    if (!isId(id)) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }

    const validationError = vehicleFieldsError(inputData);
    if (validationError) return badRequest(validationError);

    // Filter valid fields and convert empty strings to null for date/numeric fields
    const processedData = Object.fromEntries(
      Object.entries(inputData).filter(([key]) => VALID_FIELDS.includes(key)),
    );

    // Apply type conversions
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(processedData)) {
      if (key === 'tech_control_expiry' || key === 'purchase_date') {
        updateData[key] = toDate(value as string);
      } else if (key === 'purchase_price' || key === 'co2_emission') {
        updateData[key] = toNumber(value as number);
      } else if (key === 'plate' || key === 'vin') {
        updateData[key] = toUpperCase(value as string);
      } else if (key === 'fuel_type') {
        const fuelType = normalizeFuelType(value);
        if (fuelType === undefined) {
          return NextResponse.json({ error: 'Type de carburant invalide' }, { status: 400 });
        }
        updateData[key] = fuelType;
      } else if (key === 'transmission') {
        updateData[key] = value === 'manual' || value === 'automatic' ? value : null;
      } else {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    // Verify ownership or write permission
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching vehicle:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du véhicule' },
        { status: 500 },
      );
    }

    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    if (vehicle.owner_id !== user.id) {
      const { data: perm } = await supabase
        .from('vehicles_for_display')
        .select('permission_level')
        .eq('vehicle_id', id)
        .maybeSingle();
      if (perm?.permission_level !== 'write') {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    // Update vehicle
    const { data, error: updateError } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single<Vehicle>();

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      return dbErrorResponse(updateError, 'Erreur lors de la mise à jour du véhicule');
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      { message: 'Véhicule mis à jour avec succès', vehicle: data },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in /vehicles/update:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
