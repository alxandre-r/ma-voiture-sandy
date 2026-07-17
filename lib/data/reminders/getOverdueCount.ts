import { cache } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Returns the count of active (non-completed) reminders that are overdue or due soon (≤14 days).
 * Used to display a badge on the sidebar navigation item.
 * Only date-based reminders are counted (odometer-based would require a vehicle join).
 */
export const getOverdueCount = cache(
  async (): Promise<{ overdue: number; dueSoon: number }> => {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { overdue: 0, dueSoon: 0 };

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    // Single query: fetch all active date-based reminders due within 14 days
    const { data } = await supabase
      .from('reminders')
      .select('due_date')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', soonThreshold);

    const rows = data ?? [];
    const overdue = rows.filter((r) => r.due_date < nowIso).length;
    const dueSoon = rows.filter((r) => r.due_date >= nowIso).length;

    return { overdue, dueSoon };
  },
);
