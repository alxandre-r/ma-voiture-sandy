import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteToken = searchParams.get('token');

    if (!inviteToken) {
      return NextResponse.json({ error: "Token d'invitation requis" }, { status: 400 });
    }

    // Query families directly — RLS is USING(true) for authenticated users,
    // so any authenticated user can look up a family by invite token.
    // We avoid joining users here because the viewer is not yet a family member,
    // so RLS on users would block reading the owner's row (security_invoker view).
    const { data: family, error } = await supabase
      .from('families')
      .select('id, name, created_at, owner_id')
      .eq('invite_token', inviteToken)
      .maybeSingle();

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la famille' },
        { status: 500 },
      );
    }

    if (!family) {
      return NextResponse.json({ error: 'Token invalide ou famille introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      id: family.id,
      name: family.name,
      created_at: family.created_at,
      owner_id: family.owner_id,
      owner_user: null,
    });
  } catch (err) {
    console.error('Erreur serveur:', err);
    return NextResponse.json({ error: 'Erreur interne serveur' }, { status: 500 });
  }
}
