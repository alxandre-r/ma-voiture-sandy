// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dispatchDemoApi } from '@/lib/demo/api/router';
import { DEMO_DAUGHTER_ID, DEMO_FAMILY_ID, DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
import { applyOp } from '@/lib/demo/ops';
import { buildDemoSeed } from '@/lib/demo/seed';

import type { DemoApiResult } from '@/lib/demo/api/types';
import type { DemoState } from '@/lib/demo/types';

const NOW = '2026-10-01T10:00:00.000Z';
const seed = () => buildDemoSeed('2026-10-01');
const call = (state: DemoState, method: string, path: string, body: Record<string, unknown> = {}) =>
  dispatchDemoApi(method, path, { state, body, query: new URLSearchParams(), now: NOW });
const commit = (state: DemoState, result: DemoApiResult) => {
  if (result.op) applyOp(state, result.op);
  return result;
};

describe('vehicles endpoints', () => {
  it('adds a vehicle and returns the table row (id, not vehicle_id) like the real route', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'POST', 'vehicles/add', {
        name: 'Twingo',
        make: 'Renault',
        model: 'Twingo',
        year: 2015,
        plate: 'ab-123-cd',
        status: 'active',
        fuel_type: 'Essence',
        transmission: 'manual',
        odometer: 87_000,
        image: '',
        color: '#22c55e',
        tech_control_expiry: '',
      }),
    );
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({
      message: 'Vehicle created successfully',
      vehicle: {
        make: 'Renault',
        plate: 'AB-123-CD',
        owner_id: DEMO_USER_ID,
        fuel_type: 'gasoline',
        tech_control_expiry: null,
      },
    });
    expect(state.vehicles.some((v) => v.plate === 'AB-123-CD')).toBe(true);
    expect(call(state, 'POST', 'vehicles/add', { model: 'X' })).toEqual({
      status: 500,
      json: { error: 'La marque est requise' },
    });
  });

  it('updates owned or writable vehicles only', () => {
    const state = seed();
    const odometer = (vehicle_id: number) =>
      call(state, 'PATCH', 'vehicles/update', { vehicle_id, odometer: 120_000 });
    expect(odometer(DEMO_VEHICLE.peugeot308).status).toBe(200);
    expect(odometer(DEMO_VEHICLE.niro).status).toBe(200);
    expect(odometer(DEMO_VEHICLE.peugeot208)).toEqual({
      status: 403,
      json: { error: 'Non autorisé' },
    });
    expect(call(state, 'PATCH', 'vehicles/update', { vehicle_id: 101 })).toEqual({
      status: 400,
      json: { error: 'No valid fields to update' },
    });
  });

  it('stores fuel type codes and rejects unknown energies like the real routes', () => {
    const state = seed();
    const invalid = { status: 400, json: { error: 'Type de carburant invalide' } };
    expect(
      call(state, 'POST', 'vehicles/add', { make: 'Renault', model: 'Zoe', fuel_type: 'GPL' }),
    ).toEqual(invalid);
    expect(
      call(state, 'PATCH', 'vehicles/update', {
        vehicle_id: DEMO_VEHICLE.peugeot308,
        fuel_type: 'GPL',
      }),
    ).toEqual(invalid);
    const update = call(state, 'PATCH', 'vehicles/update', {
      vehicle_id: DEMO_VEHICLE.peugeot308,
      fuel_type: 'Hybride rechargeable',
    });
    expect(update.json).toMatchObject({ vehicle: { fuel_type: 'plugin_hybrid' } });
  });

  it('deletes owned vehicles only', () => {
    const state = seed();
    expect(call(state, 'DELETE', 'vehicles/delete', { vehicle_id: DEMO_VEHICLE.niro })).toEqual({
      status: 404,
      json: { error: 'Vehicle not found or you do not have permission to delete it' },
    });
    expect(
      commit(state, call(state, 'DELETE', 'vehicles/delete', { vehicle_id: DEMO_VEHICLE.zoe }))
        .status,
    ).toBe(200);
    expect(state.vehicles.some((v) => v.id === DEMO_VEHICLE.zoe)).toBe(false);
  });

  it('sets permissions for family members only', () => {
    const state = seed();
    const permissions = [{ userId: DEMO_DAUGHTER_ID, level: 'write' }];
    commit(state, call(state, 'POST', 'vehicles/permissions', { vehicleId: 101, permissions }));
    expect(
      state.permissions.find((p) => p.vehicle_id === 101 && p.user_id === DEMO_DAUGHTER_ID)
        ?.permission_level,
    ).toBe('write');
    expect(
      call(state, 'POST', 'vehicles/permissions', {
        vehicleId: 101,
        permissions: [{ userId: 'stranger', level: 'read' }],
      }),
    ).toEqual({
      status: 403,
      json: { error: 'Certains utilisateurs ne font pas partie de votre famille' },
    });
    expect(
      call(state, 'POST', 'vehicles/permissions', { vehicleId: DEMO_VEHICLE.niro, permissions })
        .status,
    ).toBe(403);
  });
});

describe('family and account endpoints', () => {
  it('renames the family', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'PATCH', 'family/update', { familyId: DEMO_FAMILY_ID, name: ' Les Durand ' }),
    );
    expect(result.json).toMatchObject({ success: true, family: { name: 'Les Durand' } });
    expect(state.families[0].name).toBe('Les Durand');
    expect(
      call(state, 'PATCH', 'family/update', { familyId: DEMO_FAMILY_ID, name: 'x'.repeat(101) })
        .status,
    ).toBe(400);
  });

  it('saves preferences and returns updated_at', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'PATCH', 'users/preferences', { default_period: 'all' }),
    );
    expect(result.json).toEqual({ success: true, updated_at: NOW });
    expect(state.preferences.find((p) => p.user_id === DEMO_USER_ID)?.default_period).toBe('all');
    expect(call(state, 'PATCH', 'users/preferences', { default_period: 'week' })).toEqual({
      status: 400,
      json: { error: 'Valeur default_period invalide' },
    });
    expect(call(state, 'PATCH', 'users/preferences', {}).status).toBe(400);
  });

  it('updates the name but refuses an email change', () => {
    const state = seed();
    const email = 'camille.durand@example.com';
    const renamed = commit(
      state,
      call(state, 'POST', 'users/update-profile', { name: 'Camille D.', email }),
    );
    expect(renamed.json).toEqual({ success: true, message: 'Profil mis à jour avec succès' });
    expect(state.users.find((u) => u.id === DEMO_USER_ID)?.name).toBe('Camille D.');
    expect(
      call(state, 'POST', 'users/update-profile', { name: 'Camille D.', email: 'new@example.com' }),
    ).toEqual({
      status: 403,
      json: { error: "Le changement d'adresse email n'est pas disponible dans la démo." },
    });
  });

  it.each([
    ['POST', 'users/change-password'],
    ['POST', 'auth/delete-account'],
    ['POST', 'attachments/add'],
    ['DELETE', 'attachments/delete'],
    ['POST', 'family/create'],
    ['POST', 'family/join'],
    ['POST', 'family/leave'],
    ['DELETE', 'family/delete'],
  ])('%s %s is disabled with an explicit message', (method, path) => {
    const result = call(seed(), method, path);
    expect(result.status).toBe(403);
    expect((result.json as { error: string }).error).toMatch(
      /n'est pas disponible dans la démo\.$/,
    );
    expect(result.op).toBeUndefined();
  });
});
