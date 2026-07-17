/**
 * @file app/api/maintenance/update/route.tsx
 * @fileoverview API endpoint for updating existing maintenance expense records.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * PATCH /api/maintenance/update
 *
 * Update an existing maintenance expense.
 * Requires authentication and ownership (or write permission) on the associated vehicle.
 *
 * Request body:
 * - id: number (required) — maintenance_expenses.id
 * - amount: number
 * - date: string (YYYY-MM-DD)
 * - notes: string | null
 * - maintenance_type: string (maintenance_type_id)
 * - odometer: number | null
 * - garage: string | null
 */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé - utilisateur non connecté' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Le champ id est requis' }, { status: 400 });
    }

    // Fetch existing maintenance record to get expense_id and vehicle_id
    const { data: existingMaintenance, error: maintenanceError } = await supabase
      .from('maintenance_expenses')
      .select('id, expense_id')
      .eq('id', body.id)
      .single();

    if (maintenanceError || !existingMaintenance) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 });
    }

    // Fetch associated expense to verify ownership
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('owner_id, vehicle_id')
      .eq('id', existingMaintenance.expense_id)
      .single();

    if (expenseError || !existingExpense) {
      return NextResponse.json({ error: 'Dépense associée non trouvée' }, { status: 404 });
    }

    if (existingExpense.owner_id !== user.id) {
      const { data: vehicle } = await supabase
        .from('vehicles_for_display')
        .select('permission_level')
        .eq('vehicle_id', existingExpense.vehicle_id)
        .maybeSingle();

      if (vehicle?.permission_level !== 'write') {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à modifier cet entretien" },
          { status: 403 },
        );
      }
    }

    // Update the expense record
    const { error: expenseUpdateError } = await supabase
      .from('expenses')
      .update({
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        date: body.date ?? undefined,
        notes: body.notes ?? null,
      })
      .eq('id', existingMaintenance.expense_id);

    if (expenseUpdateError) {
      console.error('Error updating expense:', expenseUpdateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la dépense' },
        { status: 500 },
      );
    }

    // Update the maintenance_expenses record
    const { data: updatedMaintenance, error: updateError } = await supabase
      .from('maintenance_expenses')
      .update({
        maintenance_type_id: body.maintenance_type ?? undefined,
        odometer: body.odometer ? Number(body.odometer) : null,
        garage: body.garage ?? null,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating maintenance_expense:', updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'entretien" },
        { status: 500 },
      );
    }

    // Update vehicle odometer if provided
    if (body.odometer) {
      const { error: odometerError } = await supabase
        .from('vehicles')
        .update({ odometer: body.odometer })
        .eq('id', existingExpense.vehicle_id);

      if (odometerError) {
        console.error('Error updating vehicle odometer:', odometerError);
      }
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        maintenance: updatedMaintenance,
        message: 'Entretien mis à jour avec succès',
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in /api/maintenance/update:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
