import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/search?q=<term>
 * Returns matching expenses (by notes/label) and reminders (by title)
 * scoped to the authenticated user's vehicles.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ expenses: [], reminders: [] });
  }

  try {
    // Get user's accessible vehicle IDs
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', user.id);

    const vehicleIds = (vehicles ?? []).map((v) => v.id);

    const [expensesResult, remindersResult] = await Promise.all([
      // Search expenses by notes or label
      vehicleIds.length > 0
        ? supabase
            .from('expenses_for_display')
            .select('id, type, amount, date, notes, label, vehicle_name, maintenance_type_label')
            .in('vehicle_id', vehicleIds)
            .or(
              `notes.ilike.%${q}%,label.ilike.%${q}%,vehicle_name.ilike.%${q}%,maintenance_type_label.ilike.%${q}%`,
            )
            .order('date', { ascending: false })
            .limit(8)
        : { data: [], error: null },

      // Search reminders by title
      supabase
        .from('reminders')
        .select('id, title, due_date, vehicle_id')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .ilike('title', `%${q}%`)
        .order('due_date', { ascending: true })
        .limit(5),
    ]);

    return NextResponse.json({
      expenses: expensesResult.data ?? [],
      reminders: remindersResult.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
