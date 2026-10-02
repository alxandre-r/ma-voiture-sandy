import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  findOverlap,
  formatOverlapError,
  getInstalmentDates,
  validateContractInput,
} from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';

import type { InsuranceContract } from '@/types/insurance';

/**
 * POST /api/insurance/create
 * Creates a contract (no overlap allowed on the vehicle) and backfills monthly expenses
 * from start_date to min(end_date, today).
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }
    const invalid = validateContractInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const vehicleId = Number(body.vehicle_id);
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .eq('owner_id', user.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: "Véhicule non trouvé ou vous n'êtes pas le propriétaire" },
        { status: 404 },
      );
    }

    const startDate = String(body.start_date).slice(0, 10);
    const endDate = body.end_date ? String(body.end_date).slice(0, 10) : null;

    const { data: siblings } = await supabase
      .from('insurance_contracts')
      .select('id, start_date, end_date')
      .eq('vehicle_id', vehicleId);
    const overlap = findOverlap((siblings ?? []) as InsuranceContract[], {
      start_date: startDate,
      end_date: endDate,
    });
    if (overlap) {
      return NextResponse.json({ error: formatOverlapError(overlap) }, { status: 409 });
    }

    const { data: contract, error: contractError } = await supabase
      .from('insurance_contracts')
      .insert({
        vehicle_id: vehicleId,
        owner_id: user.id,
        monthly_cost: Number(body.monthly_cost),
        start_date: startDate,
        end_date: endDate,
        provider: body.provider?.trim() || null,
      })
      .select()
      .single();

    if (contractError) {
      console.error('Error creating insurance contract:', contractError);
      return NextResponse.json(
        { error: "Erreur lors de la création du contrat d'assurance" },
        { status: 500 },
      );
    }

    const expenses = getInstalmentDates(startDate, endDate, getLocalToday()).map((date) => ({
      owner_id: user.id,
      vehicle_id: vehicleId,
      type: 'insurance',
      amount: Number(body.monthly_cost),
      date,
      insurance_contract_id: contract.id,
      notes: 'Mensualité',
    }));
    if (expenses.length > 0) {
      const { error: expensesError } = await supabase.from('expenses').insert(expenses);
      if (expensesError) {
        // Contract created but expenses failed — non-blocking
        console.error('Error backfilling insurance expenses:', expensesError);
      }
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
