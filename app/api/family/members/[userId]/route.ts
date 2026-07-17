/**
 * @file app/api/family/members/[userId]/route.ts
 * @description API endpoint to remove a member from family.
 *
 * This endpoint allows the family owner to remove a member from the family.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  // @ts-expect-error: Next.js injecte ce paramètre, typage non supporté
  context,
) {
  try {
  const userId = context.params.userId as string;
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get('familyId');

  if (!familyId) {
    return NextResponse.json({ error: 'familyId est requis' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé - utilisateur non connecté' }, { status: 401 });
  }

  // Vérifier que l'utilisateur courant est propriétaire de CETTE famille
  const { data: familyMember, error: memberError } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .maybeSingle();

  if (memberError || !familyMember || familyMember.role !== 'owner') {
    return NextResponse.json(
      { error: 'Seul le propriétaire de la famille peut supprimer des membres' },
      { status: 403 },
    );
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas vous supprimer vous-même' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }

  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error removing family member:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
