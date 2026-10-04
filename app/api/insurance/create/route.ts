import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  findOverlap,
  formatOverlapError,
  getInstalmentDates,
  INSURANCE_ERRORS,
  OVERLAP_VIOLATION,
  validateContractInput,
} from '@/lib/utils/insuranceUtils';
import { getParisToday } from '@/lib/utils/isoDate';
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
    const invalid = validateContractInput({
      monthly_cost: body.monthly_cost,
      start_date: body.start_date,
      end_date: body.end_date,
    });
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

    // Contract + backfilled instalments in one transaction (P3.4)
    const { data: contract, error: contractError } = await supabase.rpc('save_insurance_contract', {
      p_contract: {
        vehicle_id: vehicleId,
        monthly_cost: Number(body.monthly_cost),
        start_date: startDate,
        end_date: endDate,
        provider: typeof body.provider === 'string' ? body.provider.trim() || null : null,
      },
      p_instalments: getInstalmentDates(startDate, endDate, getParisToday()),
    });

    if (contractError?.code === OVERLAP_VIOLATION) {
      return NextResponse.json({ error: INSURANCE_ERRORS.overlap }, { status: 409 });
    }
    if (contractError) {
      console.error('Error creating insurance contract:', contractError);
      return NextResponse.json(
        { error: "Erreur lors de la création du contrat d'assurance" },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
