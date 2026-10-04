/**
 * @file app/api/users/update-profile/route.ts
 * @description Unified endpoint for updating user profile (name + email)
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isOptionalText,
  readJsonObject,
} from '@/lib/validation/body';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - utilisateur non connecté' },
        { status: 401 },
      );
    }

    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);

    const validationError = firstError(
      check(isOptionalText(body.name, 100), 'Nom invalide'),
      check(isOptionalText(body.email, 254), 'Adresse email invalide'),
    );
    if (validationError) return badRequest(validationError);

    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;

    // Validation minimale
    if (!name && !email) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }
    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
    }
    if (email !== undefined) {
      const isValidEmail = email.includes('@') && email.includes('.') && email.length > 5;

      if (!isValidEmail) {
        return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
      }
    }

    // Récupérer l'utilisateur actuel en base
    const { data: dbUser, error: fetchError } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();

    if (fetchError || !dbUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const updates: { name?: string; email?: string } = {};

    // Update conditionnel uniquement si changement réel
    if (name && name !== dbUser.name) {
      updates.name = name;
    }

    if (email && email !== dbUser.email) {
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: true, message: 'Aucune modification détectée' },
        { status: 200 },
      );
    }

    // Update email dans Supabase Auth si nécessaire
    if (updates.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: updates.email,
      });

      if (emailError) {
        console.error('Erreur Supabase auth.updateUser:', emailError);
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour de l'email" },
          { status: 500 },
        );
      }
    }

    // Name only: public.users.email follows auth.users.email through the DB trigger
    // on_auth_user_email_changed, i.e. once the user has confirmed the new address (P3.19)
    if (updates.name) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: updates.name })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erreur update users:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour du profil' },
          { status: 500 },
        );
      }
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      updates.email
        ? {
            success: true,
            emailPending: true,
            message: `Un lien de confirmation a été envoyé à ${updates.email}. L'adresse sera mise à jour après validation.`,
          }
        : { success: true, message: 'Profil mis à jour avec succès' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erreur serveur update-profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
