import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

export async function DELETE(request: Request) {
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

    const { data: existing, error: fetchError } = await supabase
      .from('reminders')
      .select('id, user_id, vehicle_id')
      .eq('id', body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Rappel introuvable' }, { status: 404 });
    }

    // Creator, vehicle owner or `write` member (same rule as the RLS policy)
    if (
      !(await canWriteRow(
        supabase,
        { owner_id: existing.user_id, vehicle_id: existing.vehicle_id },
        user.id,
      ))
    ) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // RLS turns a forbidden delete into a silent no-op: check that a row was really deleted
    const { data: deleted, error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', body.id)
      .select('id');

    if (!error && (!deleted || deleted.length === 0)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (error) {
      console.error('Error deleting reminder:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du rappel' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
