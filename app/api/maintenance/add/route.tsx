/**
 * @file app/api/maintenance/add/route.tsx
 * @fileoverview API endpoint for adding new maintenance expense records.
 *
 * This endpoint handles POST requests to create new maintenance expenses
 * with proper authentication and validation.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseOdometer, raiseVehicleOdometer } from '@/lib/utils/odometer';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isId,
  isNonNegativeNumber,
  isOptionalText,
  optional,
  readJsonObject,
} from '@/lib/validation/body';
import { expenseBaseError } from '@/lib/validation/expense';

import type { SavedExpense } from '@/types/rpc';

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
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    // Validate required fields
    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: 'Le champ date est requis' }, { status: 400 });
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'Le champ amount est requis' }, { status: 400 });
    }
    const fieldError = firstError(
      check(isId(body.vehicle_id), 'Le champ vehicle_id est requis'),
      check(isNonNegativeNumber(body.amount), 'Veuillez entrer un montant valide'),
      expenseBaseError(body),
      check(optional(isNonNegativeNumber)(body.odometer), 'Veuillez entrer un kilométrage valide'),
      check(
        isOptionalText(body.garage, 100),
        'Le nom du garage ne peut pas dépasser 100 caractères',
      ),
      check(isOptionalText(body.maintenance_type, 100), "Type d'entretien invalide"),
    );
    if (fieldError) return badRequest(fieldError);

    // Verify vehicle access (owner or family member with write permission)
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles_for_display')
      .select('vehicle_id, owner_id, name, make, model, permission_level')
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

    // Expense + maintenance row in one transaction (P3.4); the maintenance insert trigger
    // creates or updates the auto-reminder
    // Note: schema uses maintenance_type_id, not maintenance_type
    const { data: saved, error } = await supabase.rpc('save_expense_with_detail', {
      p_expense_id: null,
      p_expense: {
        vehicle_id: body.vehicle_id,
        type: 'maintenance',
        amount: Number(body.amount),
        date: body.date,
        notes: body.notes || null,
      },
      p_detail: {
        maintenance_type_id: body.maintenance_type || 'other',
        odometer: body.odometer ? Number(body.odometer) : null,
        garage: body.garage || null,
      },
    });

    if (error) {
      console.error('Error creating maintenance expense:', error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'entretien" },
        { status: 500 },
      );
    }
    const { expense, detail } = saved as SavedExpense<{
      maintenance_type_id: string | null;
      odometer: number | null;
      garage: string | null;
    }>;
    const maintenanceExpense = detail!;

    const odometer = parseOdometer(Number(body.odometer));
    if (odometer) await raiseVehicleOdometer(supabase, Number(body.vehicle_id), odometer);

    // Add vehicle info to response for UI
    const response = {
      ...expense,
      maintenance_type: maintenanceExpense.maintenance_type_id,
      odometer: maintenanceExpense.odometer,
      garage: maintenanceExpense.garage,
      vehicle_name: vehicle.name || `${vehicle.make} ${vehicle.model}`,
    };

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        expense: response,
        message: 'Entretien ajouté avec succès',
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
