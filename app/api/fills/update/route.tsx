/**
 * @file app/api/fills/update/route.tsx
 * @fileoverview API endpoint for updating fuel fills and electric charges.
 *
 * This endpoint handles PATCH requests to update existing fill-up records
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ODOMETER_REQUIRED, parseOdometer, raiseVehicleOdometer } from '@/lib/utils/odometer';
import { fillInputError } from '@/lib/utils/vehicleEnergy';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isId,
  optional,
  readJsonObject,
} from '@/lib/validation/body';
import { expenseBaseError, fillFieldsError } from '@/lib/validation/expense';

import type { SavedExpense } from '@/types/rpc';

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
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    const fieldError = firstError(
      check(isId(body.id), 'Le champ id est requis'),
      check(optional(isId)(body.vehicle_id), 'Véhicule invalide'),
      expenseBaseError(body),
      fillFieldsError(body),
    );
    if (fieldError) return badRequest(fieldError);

    // The fills table has no vehicle_id/date: both live on the expense
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id, owner_id, vehicle_id')
      .eq('id', body.id)
      .in('type', ['fuel', 'electric_charge'])
      .maybeSingle();

    const { data: existingFill } = existingExpense
      ? await supabase.from('fills').select('id').eq('expense_id', existingExpense.id).maybeSingle()
      : { data: null };

    if (!existingExpense || !existingFill) {
      return NextResponse.json({ error: 'Plein non trouvé' }, { status: 404 });
    }

    if (!(await canWriteRow(supabase, existingExpense, user.id))) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce plein" },
        { status: 403 },
      );
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
    const odometer = parseOdometer(body.odometer);
    if (!odometer) {
      return NextResponse.json({ error: ODOMETER_REQUIRED }, { status: 400 });
    }

    // Expense + fill in one transaction (P3.4). The RPC writes the expense first:
    // trg_enforce_fills_charge_type checks the fill against the expense type, so a
    // fill <-> charge switch only passes once the expense has the new type.
    const { data: saved, error } = await supabase.rpc('save_expense_with_detail', {
      p_expense_id: existingExpense.id,
      p_expense: {
        vehicle_id: vehicleId,
        type: isCharge ? 'electric_charge' : 'fuel',
        amount: Number(body.amount),
        date: body.date,
        notes: body.notes || null,
      },
      // fills_energy_consistency: a charge has no liters; price_per_liter is NOT NULL
      p_detail: {
        liters: isCharge ? null : (body.liters ?? null),
        price_per_liter: isCharge ? 0 : (body.price_per_liter ?? null),
        odometer,
        charge_type: isCharge ? 'charge' : 'fill',
        kwh: isCharge ? (body.kwh ?? null) : null,
        price_per_kwh: isCharge ? (body.price_per_kwh ?? null) : null,
      },
    });

    if (error) {
      console.error('Error updating fill:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du plein' },
        { status: 500 },
      );
    }
    const updatedFill = (saved as SavedExpense).detail;

    await raiseVehicleOdometer(supabase, vehicleId, odometer);

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
