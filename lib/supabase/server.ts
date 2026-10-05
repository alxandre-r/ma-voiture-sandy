/**
 * @file lib/supabase/server.ts
 * @fileoverview Cookie-bound Supabase client for Server Components and API routes.
 *              Built with the anon key: every query runs as the signed-in user under RLS,
 *              and as `anon` (no access) without a session. For RLS bypass, see ./admin.ts.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

/**
 * Retourne un Supabase client côté serveur lié aux cookies de la requête.
 * @returns SupabaseClient
 */

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
