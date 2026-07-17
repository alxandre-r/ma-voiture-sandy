/**
 * @file app/api/auth/sign-out/route.tsx
 * @fileoverview API route to sign out user and invalidate session.
 *
 * This endpoint clears the user's authentication session and redirects to sign-in page.
 */

import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/auth/sign-in', process.env.NEXT_PUBLIC_BASE_URL));
  } catch (err) {
    console.error('Error signing out:', err);
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
