/**
 * @file app/api/vehicles/permissions/route.ts
 * @description API endpoint for managing vehicle permissions.
 *
 * GET  ?vehicleId=123         — fetch current permissions for a vehicle (owner only)
 * POST { vehicleId, permissions } — set permissions for all members on a vehicle (owner only)
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicleId');

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicleId est requis' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Vérifier que l'utilisateur est propriétaire du véhicule
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', vehicleId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return NextResponse.json({ error: 'Véhicule introuvable ou accès refusé' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('vehicle_permissions')
    .select('user_id, permission_level')
    .eq('vehicle_id', vehicleId);

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des droits' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/vehicles/permissions:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
  const body = await request.json();
  const {
    vehicleId,
    permissions,
  }: {
    vehicleId: number;
    permissions: { userId: string; level: 'read' | 'write' | 'none' }[];
  } = body;

  if (!vehicleId || !Array.isArray(permissions)) {
    return NextResponse.json({ error: 'vehicleId et permissions sont requis' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Vérifier que l'utilisateur est propriétaire du véhicule
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', vehicleId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return NextResponse.json({ error: 'Véhicule introuvable ou accès refusé' }, { status: 403 });
  }

  // Collect all target user IDs that will receive permissions
  const targetUserIds = permissions.filter((p) => p.level !== 'none').map((p) => p.userId);

  if (targetUserIds.length > 0) {
    // Verify all target users are in the same family as the owner
    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('user_id, families!inner(owner_id)')
      .eq('families.owner_id', user.id)
      .in('user_id', targetUserIds);

    const allowedIds = new Set((familyMembers ?? []).map((m) => m.user_id));
    const unauthorized = targetUserIds.filter((id) => !allowedIds.has(id));

    if (unauthorized.length > 0) {
      return NextResponse.json(
        { error: "Certains utilisateurs ne font pas partie de votre famille" },
        { status: 403 },
      );
    }
  }

  const toUpsert = permissions.filter((p) => p.level !== 'none');
  const toDelete = permissions.filter((p) => p.level === 'none').map((p) => p.userId);

  // Upsert 'read' / 'write' permissions
  if (toUpsert.length > 0) {
    const { error: upsertError } = await supabase.from('vehicle_permissions').upsert(
      toUpsert.map((p) => ({
        vehicle_id: vehicleId,
        user_id: p.userId,
        permission_level: p.level,
      })),
      { onConflict: 'vehicle_id,user_id' },
    );

    if (upsertError) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des droits' },
        { status: 500 },
      );
    }
  }

  // Delete 'none' permissions
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('vehicle_permissions')
      .delete()
      .eq('vehicle_id', vehicleId)
      .in('user_id', toDelete);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des droits' },
        { status: 500 },
      );
    }
  }

  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in POST /api/vehicles/permissions:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
