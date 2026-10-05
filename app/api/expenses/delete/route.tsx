/**
 * @file app/api/expenses/delete/route.tsx
 * @fileoverview API endpoint for deleting expense records.
 *
 * This endpoint handles DELETE requests to remove expense records
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { canWriteRow } from '@/lib/api/vehicleAccess';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

/**
 * DELETE /api/expenses/delete
 *
 * Delete an existing expense record.
 * Requires authentication and ownership verification.
 *
 * Request body should contain:
 * - expenseId: number (required)
 */
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

    // Validate required field
    if (!isId(body.expenseId)) {
      return NextResponse.json({ error: 'Le champ expenseId est requis' }, { status: 400 });
    }

    // Verify expense ownership
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, owner_id, vehicle_id, type')
      .eq('id', Number(body.expenseId))
      .single();

    if (expenseError || !existingExpense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 });
    }

    // Creator, vehicle owner or write permission (P3.9)
    if (!(await canWriteRow(supabase, existingExpense, user.id))) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer cette dépense" },
        { status: 403 },
      );
    }

    // Don't allow deleting insurance expenses
    if (existingExpense.type === 'insurance') {
      return NextResponse.json(
        { error: "Les dépenses d'assurance ne peuvent pas être supprimées" },
        { status: 403 },
      );
    }

    // fills / maintenance_expenses / other_expenses cascade from expenses: one atomic delete
    const { data: deleted, error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', Number(body.expenseId))
      .select('id');

    if (error) {
      console.error('Error deleting expense:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la dépense' },
        { status: 500 },
      );
    }
    // RLS turns a forbidden delete into a silent no-op
    if (!deleted?.length) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer cette dépense" },
        { status: 403 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        message: 'Dépense supprimée avec succès',
        expenseId: body.expenseId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
