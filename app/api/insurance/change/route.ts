import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getInstalmentDates, planContractChange } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isId,
  isOptionalText,
  readJsonObject,
} from '@/lib/validation/body';

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
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }
    const fieldError = firstError(
      check(isId(body.vehicle_id), 'Le champ vehicle_id est requis'),
      check(
        isOptionalText(body.provider, 100),
        "Le nom de l'assureur ne peut pas dépasser 100 caractères",
      ),
    );
    if (fieldError) return badRequest(fieldError);
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

    // Close the current contract, create the new one and backfill its instalments in one
    // transaction (P3.4): the vehicle is never left uninsured by a half-done change
    const { data: newContract, error: createError } = await supabase.rpc(
      'save_insurance_contract',
      {
        p_contract: create,
        p_instalments: getInstalmentDates(create.start_date, null, getLocalToday()),
        p_close_id: close?.id ?? null,
        p_close_end: close?.end_date ?? null,
      },
    );

    if (createError) {
      console.error('Error changing insurance contract:', createError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du nouveau contrat' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ contract: newContract }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
