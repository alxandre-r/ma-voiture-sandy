import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isId,
  isIsoDate,
  isNonNegativeNumber,
  isOneOf,
  isOptionalText,
  isPositiveNumber,
  isText,
  readJsonObject,
} from '@/lib/validation/body';

const UPDATABLE_REMINDER_COLUMNS = [
  'vehicle_id',
  'type',
  'title',
  'description',
  'due_date',
  'due_odometer',
  'is_recurring',
  'recurrence_type',
  'recurrence_value',
] as const;

const REMINDER_TYPES = ['maintenance', 'insurance', 'inspection', 'custom'] as const;
const RECURRENCE_TYPES = ['km', 'time'] as const;

/** Absent fields are left untouched; nullable columns may be cleared with null. */
const orNull = (predicate: (value: unknown) => boolean) => (value: unknown) =>
  value == null || predicate(value);

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    if (!isId(body.id)) {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 });
    }

    const validationError = firstError(
      check(orNull(isId)(body.vehicle_id), 'Véhicule invalide'),
      check(body.type === undefined || isOneOf(body.type, REMINDER_TYPES), 'Le type est requis'),
      check(
        body.title === undefined || isText(body.title, 200),
        'Le titre est requis (200 caractères max)',
      ),
      check(
        isOptionalText(body.description, 1000),
        'La description ne doit pas dépasser 1000 caractères',
      ),
      check(orNull(isIsoDate)(body.due_date), "Date d'échéance invalide"),
      check(orNull(isNonNegativeNumber)(body.due_odometer), 'Kilométrage invalide'),
      check(
        orNull((v) => typeof v === 'boolean')(body.is_recurring),
        'Valeur is_recurring invalide',
      ),
      check(
        orNull((v) => isOneOf(v, RECURRENCE_TYPES))(body.recurrence_type),
        'Type de récurrence invalide',
      ),
      check(
        orNull(isPositiveNumber)(body.recurrence_value),
        'La récurrence doit être supérieure à 0',
      ),
    );
    if (validationError) return badRequest(validationError);

    const { data: existing, error: fetchError } = await supabase
      .from('reminders')
      .select('id, user_id')
      .eq('id', body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Rappel non trouvé' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Whitelist the editable columns: user_id, completion state and timestamps are server-owned
    const updateFields: Record<string, unknown> = {};
    for (const column of UPDATABLE_REMINDER_COLUMNS) {
      if (body[column] !== undefined) updateFields[column] = body[column];
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(updateFields)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du rappel' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ reminder: data });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
