import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Récupération de l'utilisateur connecté depuis les cookies
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Client admin avec service_role pour supprimer le compte
    const supabaseAdmin = createSupabaseAdminClient();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error('Delete account error:', error.message);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du compte.' },
        { status: 500 },
      );
    }

    // Pas besoin de token côté front pour signOut ici, mais tu peux nettoyer côté serveur si tu veux
    await supabase.auth.signOut();

    return NextResponse.json({ message: 'Compte supprimé avec succès' }, { status: 200 });
  } catch (err) {
    console.error('Delete account unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}
