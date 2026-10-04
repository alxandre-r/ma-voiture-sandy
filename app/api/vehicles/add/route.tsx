/**
 * @file src/app/api/vehicles/add/route.ts
 * @fileoverview API route to add a new vehicle linked to the authenticated user.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeFuelType } from '@/lib/utils/vehicleEnergy';
import { badRequest, INVALID_BODY, readJsonObject } from '@/lib/validation/body';
import { vehicleFieldsError } from '@/lib/validation/vehicle';

import type { Vehicle } from '@/types/vehicle';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Récupération de l'utilisateur connecté
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

    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const {
      name,
      make,
      model,
      year,
      fuel_type,
      odometer,
      plate,
      color,
      status,
      vin,
      transmission,
      image,
      tech_control_expiry,
      financing_mode,
      purchase_date,
      purchase_price,
      co2_emission,
    } = body as Partial<Vehicle>;

    const fuelType = normalizeFuelType(fuel_type);
    if (fuelType === undefined) {
      return NextResponse.json({ error: 'Type de carburant invalide' }, { status: 400 });
    }

    const validationError = vehicleFieldsError(body);
    if (validationError) return badRequest(validationError);

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

    // Insertion en base
    const { data, error } = await supabase
      .from('vehicles')
      .insert([
        {
          owner_id: user.id,
          name: name || null,
          make,
          model,
          year: year || null,
          fuel_type: fuelType,
          odometer: odometer || 0,
          color: color || null,
          plate: toUpperCase(plate),
          // New fields
          status: status || 'active',
          vin: toUpperCase(vin),
          transmission:
            transmission === 'manual' || transmission === 'automatic' ? transmission : null,
          image: image || null,
          tech_control_expiry: toDate(tech_control_expiry),
          financing_mode: financing_mode || null,
          purchase_date: toDate(purchase_date),
          purchase_price: toNumber(purchase_price),
          co2_emission: toNumber(co2_emission),
        },
      ])
      .select()
      .single<Vehicle>();

    if (error) {
      console.error('Error inserting vehicle:', error);
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('invalid input syntax for type date')) {
        errorMessage = 'Format de date invalide pour un des champs de date';
      } else if (error.message.includes('null value in column "make"')) {
        errorMessage = 'La marque est requise';
      } else if (error.message.includes('null value in column "model"')) {
        errorMessage = 'Le modèle est requis';
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ message: 'Véhicule ajouté avec succès', vehicle: data });
  } catch (err) {
    console.error('Unexpected error in /vehicles/add:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
