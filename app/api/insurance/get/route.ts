import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/insurance/get?vehicle_id=123
 * Returns insurance contracts for a specific vehicle owned by the current user.
 */
export async function GET(request: Request) {
  try {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');

  if (!vehicleId) {
    return NextResponse.json({ error: 'Le paramètre vehicle_id est requis' }, { status: 400 });
  }

  // Verify the user has at least read access to this vehicle
  const { data: vehicle } = await supabase
    .from('vehicles_for_display')
    .select('vehicle_id')
    .eq('vehicle_id', Number(vehicleId))
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: 'Véhicule introuvable ou accès refusé' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('insurance_contracts')
    .select('*')
    .eq('vehicle_id', Number(vehicleId))
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching insurance contracts:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des contrats' },
      { status: 500 },
    );
  }

  return NextResponse.json({ contracts: data });
  } catch (err) {
    console.error('Unexpected error in /api/insurance/get:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
