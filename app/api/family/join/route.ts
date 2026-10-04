/**
 * @file app/api/family/join/route.ts
 * @description API endpoint to join a family using an invitation token.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isText, readJsonObject } from '@/lib/validation/body';

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

    // Parse request body
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Le token d'invitation est requis" }, { status: 400 });
    }
    if (!isText(token, 100)) return badRequest("Token d'invitation invalide");

    // Find family with matching invite token — use admin client to bypass RLS
    // (regular user can't SELECT families they haven't joined yet)
    const adminSupabase = createSupabaseAdminClient();
    const { data: family, error: familyError } = await adminSupabase
      .from('families')
      .select('id, name, owner_id, invite_token')
      .eq('invite_token', token)
      .maybeSingle();

    if (familyError) {
      console.error('Erreur Supabase:', familyError);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche de la famille' },
        { status: 500 },
      );
    }

    if (!family) {
      return NextResponse.json(
        { error: "Token d'invitation invalide ou famille introuvable" },
        { status: 404 },
      );
    }

    // Check if user is already a member of this specific family
    const { data: existingFamilyMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_id', family.id)
      .maybeSingle();

    if (existingFamilyMember) {
      return NextResponse.json(
        { error: 'Vous êtes déjà membre de cette famille' },
        { status: 400 },
      );
    }

    // Add user to family members. Admin client: RLS only lets a family's creator insert their own
    // row, so a member can join only through this route, after the invite token check above.
    const { error: memberError } = await adminSupabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: user.id,
        role: 'member',
      })
      .select()
      .maybeSingle();

    if (memberError) {
      console.error('Erreur Supabase:', memberError);
      return NextResponse.json({ error: "Erreur lors de l'ajout à la famille" }, { status: 500 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      {
        message: 'Vous avez rejoint la famille avec succès',
        family: {
          ...family,
          userRole: 'member',
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la jointure de la famille' },
      { status: 500 },
    );
  }
}
