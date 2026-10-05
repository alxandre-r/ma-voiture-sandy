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
  isIsoDate,
  isNonNegativeNumber,
  isOneOf,
  isOptionalText,
  isPositiveNumber,
  isText,
  optional,
  readJsonObject,
} from '@/lib/validation/body';

const REMINDER_TYPES = ['maintenance', 'insurance', 'inspection', 'custom'] as const;
const RECURRENCE_TYPES = ['km', 'time'] as const;

/** Blank optional fields are stored as null; null is accepted, '' only where the route coerces it. */
const orNull = (predicate: (value: unknown) => boolean) => (value: unknown) =>
  value == null || predicate(value);

export async function POST(request: Request) {
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

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }
    if (!isOneOf(body.type, REMINDER_TYPES)) {
      return NextResponse.json({ error: 'Le type est requis' }, { status: 400 });
    }

    const validationError = firstError(
      check(isText(body.title, 200), 'Le titre ne doit pas dépasser 200 caractères'),
      check(orNull(isId)(body.vehicle_id), 'Véhicule invalide'),
      check(
        isOptionalText(body.description, 1000),
        'La description ne doit pas dépasser 1000 caractères',
      ),
      check(orNull(isIsoDate)(body.due_date), "Date d'échéance invalide"),
      check(optional(isNonNegativeNumber)(body.due_odometer), 'Kilométrage invalide'),
      check(
        orNull((v) => typeof v === 'boolean')(body.is_recurring),
        'Valeur is_recurring invalide',
      ),
      check(
        orNull((v) => isOneOf(v, RECURRENCE_TYPES))(body.recurrence_type),
        'Type de récurrence invalide',
      ),
      check(
        optional(isPositiveNumber)(body.recurrence_value),
        'La récurrence doit être supérieure à 0',
      ),
      check(orNull((v) => isText(v, 50))(body.maintenance_type_id), "Type d'entretien invalide"),
    );
    if (validationError) return badRequest(validationError);

    // Verify vehicle access when a vehicle is specified
    if (body.vehicle_id) {
      const { data: vehicle } = await supabase
        .from('vehicles_for_display')
        .select('vehicle_id, owner_id, permission_level')
        .eq('vehicle_id', Number(body.vehicle_id))
        .maybeSingle();

      const canWrite = vehicle && hasWriteAccess(vehicle, user.id);
      if (!canWrite) {
        return NextResponse.json(
          { error: "Vous n'avez pas les droits pour ajouter un rappel à ce véhicule" },
          { status: 403 },
        );
      }
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        vehicle_id: body.vehicle_id ? Number(body.vehicle_id) : null,
        type: body.type,
        title: body.title.trim(),
        description: typeof body.description === 'string' ? body.description.trim() : null,
        due_date: (body.due_date as string | null | undefined) ?? null,
        due_odometer: body.due_odometer ? Number(body.due_odometer) : null,
        is_recurring: (body.is_recurring as boolean | null | undefined) ?? false,
        recurrence_type: (body.recurrence_type as string | null | undefined) ?? null,
        recurrence_value: body.recurrence_value ? Number(body.recurrence_value) : null,
        maintenance_type_id: (body.maintenance_type_id as string | null | undefined) ?? null,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du rappel' }, { status: 500 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ reminder: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
