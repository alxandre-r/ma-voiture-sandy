import { addMonths } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

/**
 * PATCH /api/reminders/complete
 * Toggle is_completed on a reminder.
 * If the reminder is recurring and is being marked as done,
 * automatically creates the next occurrence.
 * Idempotent: a reminder already in the requested state is returned unchanged, so a double
 * click or a replayed request never creates a second next occurrence.
 */
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
    if (body.is_completed != null && typeof body.is_completed !== 'boolean') {
      return badRequest('Valeur is_completed invalide');
    }

    const is_completed = body.is_completed ?? true;

    // Fetch the full reminder to check recurrence fields
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', body.id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json({ error: 'Rappel introuvable' }, { status: 404 });
    }

    // Creator, vehicle owner or `write` member (same rule as the RLS policy)
    if (
      !(await canWriteRow(
        supabase,
        { owner_id: reminder.user_id, vehicle_id: reminder.vehicle_id },
        user.id,
      ))
    ) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Already in the requested state: nothing to do (no second next occurrence)
    if (Boolean(reminder.is_completed) === is_completed) {
      return NextResponse.json({ reminder });
    }

    // Toggle only if the state has not changed since the read (concurrent completions)
    const toggle = supabase
      .from('reminders')
      .update({
        is_completed,
        last_triggered_at: is_completed ? new Date().toISOString() : null,
      })
      .eq('id', body.id);
    const { data: updated, error: updateError } = await (
      is_completed ? toggle.not('is_completed', 'is', true) : toggle.eq('is_completed', true)
    )
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error completing reminder:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du rappel' },
        { status: 500 },
      );
    }

    // Another request toggled it first: it owns the next occurrence
    if (!updated) {
      return NextResponse.json({ reminder: { ...reminder, is_completed } });
    }

    // Create the next occurrence if the reminder is recurring and being marked as done
    if (
      is_completed &&
      reminder.is_recurring &&
      reminder.recurrence_type &&
      reminder.recurrence_value
    ) {
      let nextDueDate: string | null = null;
      let nextDueOdometer: number | null = null;

      if (reminder.recurrence_type === 'time') {
        const base = reminder.due_date ? new Date(reminder.due_date) : new Date();
        nextDueDate = addMonths(base, reminder.recurrence_value).toISOString();
      } else if (reminder.recurrence_type === 'km' && reminder.vehicle_id) {
        // Fetch the vehicle's current odometer
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('odometer')
          .eq('id', reminder.vehicle_id)
          .single();

        const baseOdometer = vehicle?.odometer ?? reminder.due_odometer ?? 0;
        nextDueOdometer = baseOdometer + reminder.recurrence_value;
      }

      await supabase.from('reminders').insert({
        user_id: user.id,
        vehicle_id: reminder.vehicle_id,
        type: reminder.type,
        title: reminder.title,
        description: reminder.description,
        due_date: nextDueDate,
        due_odometer: nextDueOdometer,
        is_recurring: true,
        recurrence_type: reminder.recurrence_type,
        recurrence_value: reminder.recurrence_value,
        maintenance_type_id: reminder.maintenance_type_id,
        is_completed: false,
      });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ reminder: updated });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
