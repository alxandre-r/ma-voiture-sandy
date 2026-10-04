import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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

    // Admin client: RLS only lets owners and members read a family, and the viewer is not a
    // member yet. Knowing the invite token is the authorization; only public fields are returned.
    const { data: family, error } = await createSupabaseAdminClient()
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
