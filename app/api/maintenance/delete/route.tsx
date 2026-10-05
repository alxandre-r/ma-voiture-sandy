/**
 * @file app/api/maintenance/delete/route.tsx
 * @fileoverview API endpoint for deleting maintenance expense records.
 *
 * This endpoint handles DELETE requests to remove maintenance expenses
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

export async function DELETE(request: Request) {
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
    const { expenseId } = body;

    if (!isId(expenseId)) {
      return NextResponse.json({ error: 'Le champ expenseId est requis' }, { status: 400 });
    }

    // Verify expense ownership before deletion
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, owner_id, vehicle_id, type')
      .eq('id', Number(expenseId))
      .eq('type', 'maintenance')
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 });
    }

    // Creator, vehicle owner or write permission (P3.9)
    const forbidden = () =>
      NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer cet entretien" },
        { status: 403 },
      );
    if (!(await canWriteRow(supabase, expense, user.id))) return forbidden();

    // Delete the expense (cascade will handle maintenance_expenses deletion)
    const { data: deleted, error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', Number(expenseId))
      .select('id');

    if (deleteError) {
      console.error('Error deleting maintenance expense:', deleteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de l'entretien" },
        { status: 500 },
      );
    }
    // RLS turns a forbidden delete into a silent no-op
    if (!deleted?.length) return forbidden();

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        message: 'Entretien supprimé avec succès',
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
