/**
 * @file app/api/fills/update/route.tsx
 * @fileoverview API endpoint for updating fuel fills and electric charges.
 *
 * This endpoint handles PATCH requests to update existing fill-up records
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fillInputError } from '@/lib/utils/vehicleEnergy';

/**
 * PATCH /api/fills/update
 *
 * Update an existing fuel fill or electric charge, and switch between the two.
 * Requires authentication and ownership verification.
 *
 * Request body should contain:
 * - id: number (required) — the **expense** id of the fill (same convention as the demo backend)
 * - vehicle_id (moves the fill; needs write access on the target vehicle)
 * - date, amount, notes, odometer, charge_type, liters, price_per_liter, kwh, price_per_kwh
 */
export async function PATCH(request: Request) {
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

    // Validate required field
    if (!body.id) {
      return NextResponse.json({ error: 'Le champ id est requis' }, { status: 400 });
    }

    // The fills table has no vehicle_id/date: both live on the expense
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id, owner_id, type, vehicle_id, amount, date, notes')
      .eq('id', body.id)
      .in('type', ['fuel', 'electric_charge'])
      .maybeSingle();

    const { data: existingFill } = existingExpense
      ? await supabase.from('fills').select('id').eq('expense_id', existingExpense.id).maybeSingle()
      : { data: null };

    if (!existingExpense || !existingFill) {
      return NextResponse.json({ error: 'Plein non trouvé' }, { status: 404 });
    }

    if (existingExpense.owner_id !== user.id) {
      const { data: vehicle } = await supabase
        .from('vehicles_for_display')
        .select('permission_level')
        .eq('vehicle_id', existingExpense.vehicle_id)
        .maybeSingle();
      if (vehicle?.permission_level !== 'write') {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à modifier ce plein" },
          { status: 403 },
        );
      }
    }

    const isCharge = body.charge_type === 'charge';
    const vehicleId = Number(body.vehicle_id) || existingExpense.vehicle_id;

    const { data: targetVehicle } = await supabase
      .from('vehicles_for_display')
      .select('owner_id, permission_level, name, fuel_type')
      .eq('vehicle_id', vehicleId)
      .maybeSingle();

    if (
      vehicleId !== existingExpense.vehicle_id &&
      (!targetVehicle ||
        (targetVehicle.owner_id !== user.id && targetVehicle.permission_level !== 'write'))
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à déplacer cette dépense vers ce véhicule" },
        { status: 403 },
      );
    }

    const inputError = fillInputError(
      targetVehicle?.fuel_type,
      isCharge ? 'charge' : 'fill',
      body.amount,
    );
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 });
    }

    // Expense first: trg_enforce_fills_charge_type checks the fill against the expense type,
    // so a fill <-> charge switch only passes once the expense has the new type.
    const { error: expenseUpdateError } = await supabase
      .from('expenses')
      .update({
        vehicle_id: vehicleId,
        type: isCharge ? 'electric_charge' : 'fuel',
        amount: Number(body.amount),
        date: body.date,
        notes: body.notes || null,
      })
      .eq('id', existingExpense.id);

    if (expenseUpdateError) {
      console.error('Error updating expense:', expenseUpdateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du plein' },
        { status: 500 },
      );
    }

    // fills_energy_consistency: a charge has no liters; price_per_liter is NOT NULL
    const { data: updatedFill, error } = await supabase
      .from('fills')
      .update({
        liters: isCharge ? null : (body.liters ?? null),
        price_per_liter: isCharge ? 0 : (body.price_per_liter ?? null),
        odometer: body.odometer ?? null,
        charge_type: isCharge ? 'charge' : 'fill',
        kwh: isCharge ? (body.kwh ?? null) : null,
        price_per_kwh: isCharge ? (body.price_per_kwh ?? null) : null,
      })
      .eq('id', existingFill.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fill:', error);
      // No transaction (roadmap P3.4): restore the expense so it stays consistent with its fill
      await supabase
        .from('expenses')
        .update({
          vehicle_id: existingExpense.vehicle_id,
          type: existingExpense.type,
          amount: existingExpense.amount,
          date: existingExpense.date,
          notes: existingExpense.notes,
        })
        .eq('id', existingExpense.id);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du plein' },
        { status: 500 },
      );
    }

    // Update vehicle odometer if fill has odometer data (RLS enforces write permission)
    if (body.odometer) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ odometer: body.odometer })
        .eq('id', vehicleId);

      if (updateError) {
        console.error('Error updating vehicle odometer:', updateError);
        // Don't fail the entire operation if odometer update fails
      }
    }

    const responseFill = {
      ...updatedFill,
      vehicle_name: targetVehicle?.name || null,
      fuel_type: targetVehicle?.fuel_type || null,
    };

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        fill: responseFill,
        message: 'Plein mis à jour avec succès',
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
