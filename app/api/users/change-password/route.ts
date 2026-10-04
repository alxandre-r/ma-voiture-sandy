/**
 * @file app/api/users/change-password/route.ts
 * @description API endpoint for changing user password.
 */

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
    const { oldPassword, newPassword } = body;

    // Validate passwords
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Les deux mots de passe sont requis' }, { status: 400 });
    }
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return badRequest('Mot de passe invalide');
    }
    // Supabase Auth hashes at most 72 bytes (bcrypt)
    if (oldPassword.length > 72 || newPassword.length > 72) {
      return badRequest('Le mot de passe ne doit pas dépasser 72 caractères');
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
        { status: 400 },
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit être différent de l'ancien" },
        { status: 400 },
      );
    }

    // Reauthenticate user with old password
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: oldPassword,
    });

    if (reauthError) {
      return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 401 });
    }

    // Update password in Supabase
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du mot de passe' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Mot de passe mis à jour avec succès',
        user: data.user,
      },
      { status: 200 },
    );
  } catch (_error) {
    // Si tu veux loguer pour debug
    console.error('Change password error:', _error);

    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du mot de passe' },
      { status: 500 },
    );
  }
}
