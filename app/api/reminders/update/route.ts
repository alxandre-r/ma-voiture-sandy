import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

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

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 });
    }

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
