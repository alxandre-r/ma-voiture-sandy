/**
 * @file app/api/fills/add/route.tsx
 * @fileoverview API endpoint for adding new fuel fill-up records.
 *
 * This endpoint handles POST requests to create new fill-up records
 * with proper authentication and validation.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ODOMETER_REQUIRED, parseOdometer, raiseVehicleOdometer } from '@/lib/utils/odometer';
import { fillInputError } from '@/lib/utils/vehicleEnergy';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé - utilisateur non connecté' }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }

    // Verify vehicle access (owner or family member with write permission)
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles_for_display')
      .select('vehicle_id, owner_id, name, fuel_type, permission_level')
      .eq('vehicle_id', body.vehicle_id)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    const canWrite = vehicle.owner_id === user.id || vehicle.permission_level === 'write';
    if (!canWrite) {
      return NextResponse.json(
        { error: "Vous n'avez pas les droits pour ajouter une dépense à ce véhicule" },
        { status: 403 },
      );
    }

    // Determine charge type and expense type
    const isCharge = body.charge_type === 'charge';
    const expenseType = isCharge ? 'electric_charge' : 'fuel';

    const inputError = fillInputError(vehicle.fuel_type, isCharge ? 'charge' : 'fill', body.amount);
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 });
    }
    const odometer = parseOdometer(body.odometer);
    if (!odometer) {
      return NextResponse.json({ error: ODOMETER_REQUIRED }, { status: 400 });
    }

    // First, create the expense record
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([
        {
          vehicle_id: body.vehicle_id,
          owner_id: user.id,
          type: expenseType,
          amount: Number(body.amount),
          date: body.date,
          notes: body.notes || null,
        },
      ])
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la dépense' },
        { status: 500 },
      );
    }

    // Then, create the fill record with the expense_id
    const { data: fill, error } = await supabase
      .from('fills')
      .insert([
        {
          expense_id: expense.id,
          odometer,
          // fills_energy_consistency: a charge has no liters; price_per_liter is NOT NULL
          liters: isCharge ? null : (body.liters ?? null),
          price_per_liter: isCharge ? 0 : (body.price_per_liter ?? null),
          // Electric vehicle fields
          charge_type: isCharge ? 'charge' : 'fill',
          kwh: isCharge ? (body.kwh ?? null) : null,
          price_per_kwh: isCharge ? (body.price_per_kwh ?? null) : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding fill:', error);
      // Rollback: delete the expense if fill creation fails
      await supabase.from('expenses').delete().eq('id', expense.id);
      return NextResponse.json({ error: "Erreur lors de l'ajout du plein" }, { status: 500 });
    }

    await raiseVehicleOdometer(supabase, vehicle.vehicle_id, odometer);

    // Add vehicle info to response for UI
    const responseFill = {
      ...fill,
      vehicle_id: body.vehicle_id,
      vehicle_name: vehicle.name,
      fuel_type: vehicle.fuel_type,
      date: body.date,
      amount: body.amount,
      notes: body.notes,
    };

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        fill: responseFill,
        message: isCharge ? 'Recharge ajoutée avec succès' : 'Plein ajouté avec succès',
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
