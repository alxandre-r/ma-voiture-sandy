/**
 * @file app/api/family/create/route.ts
 * @description API endpoint for creating a family.
 *
 * This endpoint handles the family creation process with proper validation and security.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, readJsonObject } from '@/lib/validation/body';

export async function POST(request: Request) {
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
    const { name } = body;

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

    // Create the family
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert([
        {
          name: name.trim(),
          owner_id: user.id,
        },
      ])
      .select()
      .single();

    if (familyError) {
      console.error('Erreur Supabase lors de la création de la famille:', familyError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la famille' },
        { status: 500 },
      );
    }

    // Add the user as owner to the family
    const { error: memberError } = await supabase.from('family_members').insert([
      {
        family_id: familyData.id,
        user_id: user.id,
        role: 'owner',
      },
    ]);

    if (memberError) {
      console.error("Erreur Supabase lors de l'ajout du propriétaire à la famille:", memberError);
      // Delete the family if we couldn't add the owner
      await supabase.from('families').delete().eq('id', familyData.id);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la famille' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        success: true,
        message: 'Famille créée avec succès',
        family: familyData,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur serveur lors de la création de la famille:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la famille' },
      { status: 500 },
    );
  }
}
