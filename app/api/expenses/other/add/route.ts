import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { hasWriteAccess } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isId,
  isNonNegativeNumber,
  isText,
  readJsonObject,
} from '@/lib/validation/body';
import { expenseBaseError } from '@/lib/validation/expense';

import type { SavedExpense } from '@/types/rpc';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé - utilisateur non connecté' }, { status: 401 });
  }

  try {
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: 'Le champ date est requis' }, { status: 400 });
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'Le champ amount est requis' }, { status: 400 });
    }
    if (!body.label) {
      return NextResponse.json({ error: 'Le champ label est requis' }, { status: 400 });
    }
    const fieldError = firstError(
      check(isId(body.vehicle_id), 'Le champ vehicle_id est requis'),
      check(isNonNegativeNumber(body.amount), 'Veuillez entrer un montant valide'),
      expenseBaseError(body),
      check(isText(body.label, 100), 'Le libellé doit faire entre 1 et 100 caractères'),
    );
    if (fieldError) return badRequest(fieldError);

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles_for_display')
      .select('vehicle_id, owner_id, name, make, model, permission_level')
      .eq('vehicle_id', body.vehicle_id)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    const canWrite = hasWriteAccess(vehicle, user.id);
    if (!canWrite) {
      return NextResponse.json(
        { error: "Vous n'avez pas les droits pour ajouter une dépense à ce véhicule" },
        { status: 403 },
      );
    }

    // Expense + label row in one transaction (P3.4)
    const { data: saved, error } = await supabase.rpc('save_expense_with_detail', {
      p_expense_id: null,
      p_expense: {
        vehicle_id: body.vehicle_id,
        type: 'other',
        amount: Number(body.amount),
        date: body.date,
        notes: body.notes || null,
      },
      p_detail: { label: body.label },
    });

    if (error) {
      console.error('Error creating other expense:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la dépense' },
        { status: 500 },
      );
    }
    const { expense, detail: otherExpense } = saved as SavedExpense<{ label: string }>;

    const response = {
      ...expense,
      label: otherExpense!.label,
      vehicle_name: vehicle.name || `${vehicle.make} ${vehicle.model}`,
    };

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        expense: response,
        message: 'Dépense ajoutée avec succès',
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
