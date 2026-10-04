import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findOverlap, formatOverlapError, validateContractInput } from '@/lib/utils/insuranceUtils';
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
 * PATCH /api/insurance/update
 * Updates an insurance contract (no overlap allowed with the vehicle's other contracts).
 * The DB trigger sync_insurance_expenses_after_update regenerates the contract's monthly
 * expenses when cost, dates or vehicle change.
 */
export async function PATCH(request: Request) {
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

    if (!body.id) {
      return NextResponse.json({ error: "L'identifiant du contrat est requis" }, { status: 400 });
    }
    const fieldError = firstError(
      check(isId(body.id), "L'identifiant du contrat est requis"),
      check(
        isOptionalText(body.provider, 100),
        "Le nom de l'assureur ne peut pas dépasser 100 caractères",
      ),
    );
    if (fieldError) return badRequest(fieldError);

    // Verify contract ownership before updating
    const { data: existing, error: fetchError } = await supabase
      .from('insurance_contracts')
      .select('*')
      .eq('id', body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Contrat d'assurance introuvable" }, { status: 404 });
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.provider !== undefined) {
      updates.provider = typeof body.provider === 'string' ? body.provider.trim() || null : null;
    }
    if (body.monthly_cost !== undefined) updates.monthly_cost = Number(body.monthly_cost);
    if (body.start_date !== undefined) updates.start_date = String(body.start_date).slice(0, 10);
    if (body.end_date !== undefined) {
      updates.end_date = body.end_date ? String(body.end_date).slice(0, 10) : null;
    }

    const merged = { ...existing, ...updates } as InsuranceContract;
    const invalid = validateContractInput(merged);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { data: siblings } = await supabase
      .from('insurance_contracts')
      .select('id, start_date, end_date')
      .eq('vehicle_id', existing.vehicle_id);
    const overlap = findOverlap((siblings ?? []) as InsuranceContract[], merged, existing.id);
    if (overlap) {
      return NextResponse.json({ error: formatOverlapError(overlap) }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('insurance_contracts')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance contract:', error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du contrat d'assurance" },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ contract: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
