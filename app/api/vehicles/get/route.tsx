/**
 * @file app/api/vehicles/get/route.tsx
 * @fileoverview API route to fetch vehicles for authenticated user.
 *
 * This endpoint returns all vehicles owned by the currently authenticated user,
 * ordered by creation date (newest first).
 */

import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/vehicles/get
 *
 * Fetch vehicles for authenticated user.
 *
 * @returns {Promise<NextResponse>} JSON response with vehicles array or error
 */
export async function GET() {
  try {
  const supabase = await createSupabaseServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Fetch vehicles owned by this user
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles_for_display')
    .select('*')
    .eq('owner_id', user.id);

  if (vehiclesError) {
    return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
  }

  // Fetch insurance contracts for all vehicles
  const vehicleIds = vehicles?.map((v) => v.vehicle_id) || [];

  let insuranceData: Record<
    number,
    Array<{
      id: number;
      start_date: string;
      end_date: string | null;
      monthly_cost: number;
      provider: string | null;
    }>
  > = {};

  if (vehicleIds.length > 0) {
    const { data: contracts, error: insuranceError } = await supabase
      .from('insurance_contracts')
      .select('id, vehicle_id, start_date, end_date, monthly_cost, provider')
      .in('vehicle_id', vehicleIds)
      .order('start_date', { ascending: false });

    if (!insuranceError && contracts) {
      // Group by vehicle_id
      insuranceData = contracts.reduce(
        (acc, contract) => {
          const vid = contract.vehicle_id;
          if (!acc[vid]) {
            acc[vid] = [];
          }
          acc[vid].push({
            id: contract.id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            monthly_cost: contract.monthly_cost,
            provider: contract.provider,
          });
          return acc;
        },
        {} as typeof insuranceData,
      );
    }
  }

  // Attach insurance data to vehicles
  const vehiclesWithInsurance =
    vehicles?.map((vehicle) => ({
      ...vehicle,
      insurance_history: insuranceData[vehicle.vehicle_id] || [],
    })) || [];

  return NextResponse.json({ vehicles: vehiclesWithInsurance });
  } catch (err) {
    console.error('Unexpected error in /api/vehicles/get:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
