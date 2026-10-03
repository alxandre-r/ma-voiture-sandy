/**
 * @file app/api/expenses/update/route.tsx
 * @fileoverview API endpoint for updating expense records.
 *
 * This endpoint handles PATCH requests to update existing expense records
 * with proper authentication and ownership verification.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const UPDATABLE_EXPENSE_COLUMNS = ['vehicle_id', 'date', 'amount', 'notes'] as const;

/**
 * PATCH /api/expenses/update
 *
 * Update an existing expense record.
 * Requires authentication and ownership verification.
 *
 * Request body should contain:
 * - id: number (required)
 * - Any other fields to update (date, amount, type, notes, etc.)
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
    // Parse request body
    const body = await request.json();

    // Validate required field
    if (!body.id) {
      return NextResponse.json({ error: 'Le champ id est requis' }, { status: 400 });
    }

    // Verify expense ownership
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, owner_id, vehicle_id, type')
      .eq('id', body.id)
      .single();

    if (expenseError || !existingExpense) {
      return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 });
    }

    if (existingExpense.owner_id !== user.id) {
      const { data: vehicle } = await supabase
        .from('vehicles_for_display')
        .select('permission_level')
        .eq('vehicle_id', existingExpense.vehicle_id)
        .maybeSingle();
      if (vehicle?.permission_level !== 'write') {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à modifier cette dépense" },
          { status: 403 },
        );
      }
    }

    // Whitelist the editable expenses columns. Fill/maintenance/other fields are handled below;
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
      const { data: target } = await supabase
        .from('vehicles_for_display')
        .select('owner_id, permission_level')
        .eq('vehicle_id', updateData.vehicle_id)
        .maybeSingle();
      if (!target || (target.owner_id !== user.id && target.permission_level !== 'write')) {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à déplacer cette dépense vers ce véhicule" },
          { status: 403 },
        );
      }
    }

    // Update expense record (ownership/permission already verified above)
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la dépense' },
        { status: 500 },
      );
    }

    // Handle category-specific updates (maintenance_expenses, other_expenses, fills)
    const expenseType = body.type || existingExpense.type;

    // For fuel and electric_charge, also update the fills table
    if (expenseType === 'fuel' || expenseType === 'electric_charge') {
      // Find the fill associated with this expense
      const { data: existingFill } = await supabase
        .from('fills')
        .select('id')
        .eq('expense_id', body.id)
        .single();

      if (existingFill) {
        // Update the fill with new values if provided
        const fillUpdateData: Record<string, unknown> = {};

        // Always update odometer if provided
        if (body.odometer !== undefined) fillUpdateData.odometer = body.odometer;

        // For fuel expenses - update liters and price_per_liter
        if (expenseType === 'fuel') {
          if (body.liters !== undefined) fillUpdateData.liters = body.liters;
          if (body.price_per_liter !== undefined)
            fillUpdateData.price_per_liter = body.price_per_liter;
        }

        // For electric_charge expenses - update kwh and price_per_kwh
        if (expenseType === 'electric_charge') {
          if (body.kwh !== undefined) fillUpdateData.kwh = body.kwh;
          if (body.price_per_kwh !== undefined) fillUpdateData.price_per_kwh = body.price_per_kwh;
        }

        if (Object.keys(fillUpdateData).length > 0) {
          const { error: fillError } = await supabase
            .from('fills')
            .update(fillUpdateData)
            .eq('id', existingFill.id);

          if (fillError) {
            console.error('Error updating fill:', fillError);
          }
        }
      }
    }

    if (expenseType === 'maintenance') {
      // Check if maintenance_expenses record exists
      const { data: existingMaintenance } = await supabase
        .from('maintenance_expenses')
        .select('expense_id')
        .eq('expense_id', body.id)
        .single();

      if (existingMaintenance) {
        // Update maintenance_expenses
        // Note: schema uses maintenance_type_id, not maintenance_type
        const { error: maintenanceError } = await supabase
          .from('maintenance_expenses')
          .update({
            maintenance_type_id: body.maintenance_type || null,
            odometer: body.odometer || null,
            garage: body.garage || null,
          })
          .eq('expense_id', body.id);

        if (maintenanceError) {
          console.error('Error updating maintenance_expenses:', maintenanceError);
        }

        // Recompute auto-reminder after edit (trigger only fires on INSERT)
        if (body.maintenance_type && existingExpense.vehicle_id) {
          await supabase.rpc('update_maintenance_reminder', {
            p_vehicle_id: existingExpense.vehicle_id,
            p_maintenance_type_id: body.maintenance_type,
          });
        }
      } else {
        // Insert new maintenance_expenses
        // Note: schema uses maintenance_type_id, not maintenance_type
        const { error: maintenanceError } = await supabase.from('maintenance_expenses').insert({
          expense_id: body.id,
          maintenance_type_id: body.maintenance_type || null,
          odometer: body.odometer || null,
          garage: body.garage || null,
        });

        if (maintenanceError) {
          console.error('Error inserting maintenance_expenses:', maintenanceError);
        }
      }
    } else if (expenseType === 'other') {
      // Check if other_expenses record exists
      const { data: existingOther } = await supabase
        .from('other_expenses')
        .select('expense_id')
        .eq('expense_id', body.id)
        .single();

      if (existingOther) {
        // Update other_expenses
        const { error: otherError } = await supabase
          .from('other_expenses')
          .update({
            label: body.label || null,
          })
          .eq('expense_id', body.id);

        if (otherError) {
          console.error('Error updating other_expenses:', otherError);
        }
      } else {
        // Insert new other_expenses
        const { error: otherError } = await supabase.from('other_expenses').insert({
          expense_id: body.id,
          label: body.label || null,
        });

        if (otherError) {
          console.error('Error inserting other_expenses:', otherError);
        }
      }
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
