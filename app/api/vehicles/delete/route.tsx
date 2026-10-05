/**
 * @file app/api/vehicles/delete/route.tsx
 * @fileoverview API route to delete a vehicle.
 *
 * This endpoint allows authenticated users to delete their own vehicles.
 * Includes proper authentication and authorization checks.
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { dbErrorResponse } from '@/lib/api/dbErrors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

/**
 * DELETE /api/vehicles/delete
 *
 * Delete a vehicle owned by the authenticated user.
 *
 * @param {Request} request - The incoming HTTP request with vehicle ID in JSON body
 * @returns {Promise<NextResponse>} JSON response with success or error message
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - utilisateur non connecté' },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const { vehicle_id } = body;

    if (!isId(vehicle_id)) {
      return NextResponse.json({ error: 'Le champ vehicle_id est requis' }, { status: 400 });
    }

    // First, verify the vehicle exists and is owned by the user
    const { data: vehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, owner_id')
      .eq('id', vehicle_id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching vehicle:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du véhicule' },
        { status: 500 },
      );
    }

    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule introuvable ou accès refusé' }, { status: 404 });
    }

    // Delete the vehicle
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicle_id)
      .eq('owner_id', user.id);

    if (deleteError) {
      console.error('Error deleting vehicle:', deleteError);
      return dbErrorResponse(deleteError, 'Erreur lors de la suppression du véhicule');
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(
      { message: 'Véhicule supprimé avec succès', vehicle_id },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in /vehicles/delete:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
