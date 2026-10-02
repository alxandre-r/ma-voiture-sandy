import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getInstalmentDates, planContractChange } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';

import type { InsuranceContract } from '@/types/insurance';

/**
 * POST /api/insurance/change — "Changer de contrat".
 * Closes the vehicle's latest contract on effective_date − 1 (when it would still run then),
 * creates an open contract from effective_date and backfills its instalments up to today.
 *
 * Body: vehicle_id, monthly_cost, effective_date (YYYY-MM-DD), provider? (defaults to the closed one's)
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
    const vehicleId = Number(body.vehicle_id);

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!vehicle) {
      return NextResponse.json(
        { error: "Véhicule non trouvé ou vous n'êtes pas le propriétaire" },
        { status: 404 },
      );
    }

    const { data } = await supabase
      .from('insurance_contracts')
      .select('id, start_date, end_date, provider')
      .eq('vehicle_id', vehicleId);
    const contracts = (data ?? []) as InsuranceContract[];

    const plan = planContractChange(contracts, {
      vehicle_id: vehicleId,
      monthly_cost: body.monthly_cost,
      effective_date: body.effective_date,
      provider: body.provider,
    });
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

    const { close, create } = plan;
    const previousEnd = close ? (contracts.find((c) => c.id === close.id)?.end_date ?? null) : null;

    if (close) {
      const { error: closeError } = await supabase
        .from('insurance_contracts')
        .update({ end_date: close.end_date })
        .eq('id', close.id);
      if (closeError) {
        console.error('Error closing insurance contract:', closeError);
        return NextResponse.json(
          { error: 'Erreur lors de la clôture du contrat actuel' },
          { status: 500 },
        );
      }
    }

    const { data: newContract, error: createError } = await supabase
      .from('insurance_contracts')
      .insert({ ...create, owner_id: user.id })
      .select()
      .single();

    if (createError) {
      console.error('Error creating new insurance contract:', createError);
      if (close) {
        // Restore the closed contract so the vehicle is not left uninsured
        await supabase
          .from('insurance_contracts')
          .update({ end_date: previousEnd })
          .eq('id', close.id);
      }
      return NextResponse.json(
        { error: 'Erreur lors de la création du nouveau contrat' },
        { status: 500 },
      );
    }

    const expenses = getInstalmentDates(create.start_date, null, getLocalToday()).map((date) => ({
      owner_id: user.id,
      vehicle_id: vehicleId,
      type: 'insurance',
      amount: create.monthly_cost,
      date,
      insurance_contract_id: newContract.id,
      notes: 'Mensualité',
    }));
    if (expenses.length > 0) {
      const { error: expensesError } = await supabase.from('expenses').insert(expenses);
      if (expensesError) console.error('Error backfilling insurance expenses:', expensesError);
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ contract: newContract }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
