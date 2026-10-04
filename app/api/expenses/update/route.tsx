/**
 * @file app/api/expenses/update/route.tsx
 * @fileoverview API endpoint for updating expense records.
 *
 * This endpoint handles PATCH requests to update existing expense records
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow, canWriteVehicle } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isBlank,
  isId,
  isIsoDate,
  isNonNegativeNumber,
  isOptionalText,
  isText,
  optional,
  readJsonObject,
} from '@/lib/validation/body';
import { fillFieldsError, INVALID_DATE, NOTES_MAX, NOTES_TOO_LONG } from '@/lib/validation/expense';

import type { JsonBody } from '@/lib/validation/body';
import type { SavedExpense } from '@/types/rpc';

const UPDATABLE_EXPENSE_COLUMNS = ['vehicle_id', 'date', 'amount', 'notes'] as const;

/** Detail-row fields this route may write, by expense type. Undefined = leave the row alone. */
function detailPatch(type: string, body: JsonBody): Record<string, unknown> | null {
  const pick = (columns: string[]) => {
    const patch: Record<string, unknown> = {};
    for (const column of columns) if (body[column] !== undefined) patch[column] = body[column];
    return Object.keys(patch).length > 0 ? patch : null;
  };
  switch (type) {
    case 'fuel':
      return pick(['odometer', 'liters', 'price_per_liter']);
    case 'electric_charge':
      return pick(['odometer', 'kwh', 'price_per_kwh']);
    case 'maintenance':
      if (['maintenance_type', 'odometer', 'garage'].every((key) => body[key] === undefined)) {
        return null;
      }
      // Note: schema uses maintenance_type_id, not maintenance_type
      return {
        maintenance_type_id: body.maintenance_type || null,
        odometer: body.odometer || null,
        garage: body.garage || null,
      };
    case 'other':
      // label is NOT NULL: only written when sent
      return isBlank(body.label) ? null : { label: body.label };
    default:
      return null;
  }
}

/**
 * PATCH /api/expenses/update
 *
 * Update an existing expense record.
 * Requires authentication and ownership verification.
 *
 * Request body should contain:
 * - id: number (required)
 * - Any other fields to update (date, amount, notes, vehicle_id, and the detail fields of the
 *   expense's type). The type itself never changes here.
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

    // Validate required field
    if (!body.id) {
      return NextResponse.json({ error: 'Le champ id est requis' }, { status: 400 });
    }
    const fieldError = firstError(
      check(isId(body.id), 'Le champ id est requis'),
      check(optional(isId)(body.vehicle_id), 'Véhicule invalide'),
      check(body.date === undefined || isIsoDate(body.date), INVALID_DATE),
      check(
        body.amount === undefined || isNonNegativeNumber(body.amount),
        'Veuillez entrer un montant valide',
      ),
      check(isOptionalText(body.notes, NOTES_MAX), NOTES_TOO_LONG),
      fillFieldsError(body),
      check(optional(isNonNegativeNumber)(body.odometer), 'Veuillez entrer un kilométrage valide'),
      check(
        isOptionalText(body.garage, 100),
        'Le nom du garage ne peut pas dépasser 100 caractères',
      ),
      check(isOptionalText(body.maintenance_type, 100), "Type d'entretien invalide"),
      check(
        isBlank(body.label) || isText(body.label, 100),
        'Le libellé doit faire entre 1 et 100 caractères',
      ),
    );
    if (fieldError) return badRequest(fieldError);

    // Verify expense ownership
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, owner_id, vehicle_id, type')
      .eq('id', body.id)
      .single();

    if (expenseError || !existingExpense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 });
    }

    // Creator, vehicle owner or write permission (P3.9)
    if (!(await canWriteRow(supabase, existingExpense, user.id))) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cette dépense" },
        { status: 403 },
      );
    }

    // Whitelist the editable expenses columns. Detail fields are handled by detailPatch();
    // owner_id, type, insurance_contract_id and timestamps are never client-writable.
    const updateData: Record<string, unknown> = {};
    for (const column of UPDATABLE_EXPENSE_COLUMNS) {
      if (body[column] !== undefined) updateData[column] = body[column];
    }

    // Moving the expense to another vehicle requires write access on the target vehicle
    if (updateData.vehicle_id != null && updateData.vehicle_id !== existingExpense.vehicle_id) {
      if (existingExpense.type === 'insurance') {
        return NextResponse.json(
          { error: "Une mensualité d'assurance ne peut pas changer de véhicule" },
          { status: 400 },
        );
      }
      if (!(await canWriteVehicle(supabase, updateData.vehicle_id as number, user.id))) {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à déplacer cette dépense vers ce véhicule" },
          { status: 403 },
        );
      }
    }

    // Expense + detail row in one transaction (P3.4)
    const { data: saved, error } = await supabase.rpc('save_expense_with_detail', {
      p_expense_id: existingExpense.id,
      p_expense: updateData,
      p_detail: detailPatch(existingExpense.type, body),
    });

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la dépense' },
        { status: 500 },
      );
    }
    const updatedExpense = (saved as SavedExpense).expense;

    // Recompute auto-reminder after edit (trigger only fires on INSERT). Outside the
    // transaction on purpose: the function refuses non-owners, which must not block the edit.
    if (existingExpense.type === 'maintenance' && body.maintenance_type) {
      await supabase.rpc('update_maintenance_reminder', {
        p_vehicle_id: updatedExpense.vehicle_id,
        p_maintenance_type_id: body.maintenance_type,
      });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        expense: updatedExpense,
        message: 'Dépense mise à jour avec succès',
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
