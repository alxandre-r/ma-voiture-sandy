/**
 * @file app/api/family/update/route.ts
 * @description API endpoint for updating family information.
 *
 * This endpoint handles updating family name and other properties.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isUuid, readJsonObject } from '@/lib/validation/body';

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé - utilisateur non connecté' },
        { status: 401 },
      );
    }

    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const { familyId, name } = body;

    // Validate family ID
    if (!isUuid(familyId)) {
      return NextResponse.json({ error: "L'ID de la famille est requis" }, { status: 400 });
    }

    // Validate family name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Le nom de la famille est requis' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Le nom de la famille ne doit pas dépasser 100 caractères' },
        { status: 400 },
      );
    }

    // Check if user is owner of the family
    const { data: familyMember, error: memberError } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !familyMember) {
      return NextResponse.json(
        { error: "Vous ne faites pas partie de cette famille ou elle n'existe pas" },
        { status: 403 },
      );
    }

    if (familyMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut modifier les informations de la famille' },
        { status: 403 },
      );
    }

    // Update the family
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .update({
        name: name.trim(),
      })
      .eq('id', familyId)
      .select()
      .single();

    if (familyError) {
      console.error('Erreur Supabase lors de la mise à jour de la famille:', familyError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la famille' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        success: true,
        message: 'Famille mise à jour avec succès',
        family: familyData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erreur serveur lors de la mise à jour de la famille:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de la famille' },
      { status: 500 },
    );
  }
}
