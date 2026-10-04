/**
 * @file app/api/family/delete/route.ts
 * @description API endpoint for deleting a family.
 *
 * This endpoint handles the process of deleting a family (only available to owners).
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isUuid, readJsonObject } from '@/lib/validation/body';

export async function DELETE(request: Request) {
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
    const { familyId } = body;

    // Validate family ID
    if (!isUuid(familyId)) {
      return NextResponse.json({ error: "L'ID de la famille est requis" }, { status: 400 });
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
        { error: 'Seul le propriétaire peut supprimer la famille' },
        { status: 403 },
      );
    }

    // Delete the family (this will cascade to family_members due to foreign key constraints)
    const { error: deleteError } = await supabase.from('families').delete().eq('id', familyId);

    if (deleteError) {
      console.error('Erreur Supabase lors de la suppression de la famille:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la famille' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        success: true,
        message: 'Famille supprimée avec succès',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erreur serveur lors de la suppression de la famille:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression de la famille' },
      { status: 500 },
    );
  }
}
