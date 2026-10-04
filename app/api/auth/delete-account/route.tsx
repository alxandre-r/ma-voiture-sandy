import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Removes the deleted user's Storage files that no remaining attachment row references. */
async function removeUserFiles(admin: AdminClient, userId: string) {
  const { data, error } = await admin.rpc('orphaned_user_storage_objects', { p_user_id: userId });
  if (error) {
    console.error('Delete account: listing files failed:', error.message);
    return;
  }
  const byBucket = new Map<string, string[]>();
  for (const { bucket_id, name } of (data ?? []) as { bucket_id: string; name: string }[]) {
    byBucket.set(bucket_id, [...(byBucket.get(bucket_id) ?? []), name]);
  }
  for (const [bucket, names] of byBucket) {
    const { error: removeError } = await admin.storage.from(bucket).remove(names);
    if (removeError) console.error(`Delete account: removing ${bucket} files failed:`, removeError);
  }
}

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

    // The DB deleted the user's data with the account (2026-10-04-07, P3.18); their files are
    // left in Storage, which only the Storage API can remove. Best effort: the account is gone.
    await removeUserFiles(supabaseAdmin, user.id);

    await supabase.auth.signOut();

    return NextResponse.json({ message: 'Compte supprimé avec succès' }, { status: 200 });
  } catch (err) {
    console.error('Delete account unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue.' }, { status: 500 });
  }
}
