/**
 * @file lib/supabaseBrowser.ts
 * @fileoverview Crée un client Supabase côté navigateur qui synchronise la session via cookies
 *             (utilisé conjointement avec createServerClient côté serveur).
 *
 * Important: utilise '@supabase/ssr' createBrowserClient pour que la session soit partagée
 * via les cookies que le server client (createServerClient) peut lire.
 */

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
