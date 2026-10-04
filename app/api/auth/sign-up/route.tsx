import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  badRequest,
  check,
  firstError,
  INVALID_BODY,
  isText,
  readJsonObject,
} from '@/lib/validation/body';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const body = await readJsonObject(req);
    if (!body) return badRequest(INVALID_BODY);
    // Typed as strings for the calls below: the checks that follow reject anything else
    const { name, email, password } = body as Record<'name' | 'email' | 'password', string>;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }

    const validationError = firstError(
      check(isText(name, 100), 'Nom invalide'),
      check(isText(email, 254) && EMAIL_PATTERN.test(email), 'Adresse email invalide'),
      // Supabase Auth requires 6+ characters and hashes at most 72 bytes (bcrypt)
      check(
        typeof password === 'string' && password.length >= 6 && password.length <= 72,
        'Le mot de passe doit contenir entre 6 et 72 caractères',
      ),
    );
    if (validationError) return badRequest(validationError);

    // Vérifie si l'utilisateur existe déjà dans auth.users ou table users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 });
    }

    // Crée l'utilisateur Supabase (email confirmé immédiatement)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser) {
      console.error('Erreur création utilisateur:', createError);
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
    }

    // Insère l'utilisateur dans la table users
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: newUser.user.id, // correspond à auth.users.id
      email,
      name,
    });

    if (insertError) {
      console.error('Erreur insertion utilisateur dans users:', insertError);
      // Optionnel : supprimer l'utilisateur Supabase si insert échoue
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: "Erreur lors de l'ajout dans users" }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Inscription réussie. Vous pouvez vous connecter.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('Erreur API sign-up:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
