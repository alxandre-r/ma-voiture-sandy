/**
 * @file lib/supabase/admin.ts
 * @fileoverview Service-role Supabase client: bypasses RLS. Server-only (API routes).
 *              Use it only after the caller has been authenticated and authorized in code,
 *              and only for what RLS cannot express (auth admin API, invite-token lookups,
 *              writes on another user's rows by the family owner).
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
