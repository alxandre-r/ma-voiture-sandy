/**
 * @file app/api/users/preferences/route.ts
 * @description Endpoint for updating user preferences
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, readJsonObject } from '@/lib/validation/body';

const ALLOWED_FIELDS = [
  'show_consumption',
  'show_insurance',
  'show_vehicle_details',
  'show_financials',
  'default_period',
  'default_vehicle_scope',
] as const;

const VALID_PERIODS = ['month', 'year', 'all'] as const;
const VALID_SCOPES = ['personal', 'family', 'all'] as const;

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - utilisateur non connecté' },
        { status: 401 },
      );
    }

    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    // Only accept known fields
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    // Validate enum values
    if ('default_period' in updates && !VALID_PERIODS.includes(updates.default_period as never)) {
      return NextResponse.json({ error: 'Valeur default_period invalide' }, { status: 400 });
    }
    if (
      'default_vehicle_scope' in updates &&
      !VALID_SCOPES.includes(updates.default_vehicle_scope as never)
    ) {
      return NextResponse.json({ error: 'Valeur default_vehicle_scope invalide' }, { status: 400 });
    }

    // Validate boolean fields
    for (const field of [
      'show_consumption',
      'show_insurance',
      'show_vehicle_details',
      'show_financials',
    ] as const) {
      if (field in updates && typeof updates[field] !== 'boolean') {
        return NextResponse.json({ error: `Valeur ${field} invalide` }, { status: 400 });
      }
    }

    updates.updated_at = new Date().toISOString();
    updates.user_id = user.id;

    const { error: updateError } = await supabase
      .from('user_preferences')
      .upsert(updates, { onConflict: 'user_id' });

    if (updateError) {
      console.error('Erreur update user_preferences:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des préférences' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, updated_at: updates.updated_at }, { status: 200 });
  } catch (error) {
    console.error('Erreur serveur preferences:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
