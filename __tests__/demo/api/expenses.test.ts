// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dispatchDemoApi } from '@/lib/demo/api/router';
import { DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
import { applyOp } from '@/lib/demo/ops';
import { buildDemoSeed } from '@/lib/demo/seed';

import type { DemoApiResult } from '@/lib/demo/api/types';
import type { DemoState } from '@/lib/demo/types';

const NOW = '2026-10-01T10:00:00.000Z';
const seed = () => buildDemoSeed('2026-10-01');
const call = (state: DemoState, method: string, path: string, body: Record<string, unknown>) =>
  dispatchDemoApi(method, path, { state, body, query: new URLSearchParams(), now: NOW });
/** Applies the op of a call, like the cookie round-trip does between two requests. */
const commit = (state: DemoState, result: DemoApiResult) => {
  if (result.op) applyOp(state, result.op);
  return result;
};

// Same payload as useFillActions.addFill
const fill = {
  vehicle_id: DEMO_VEHICLE.peugeot308,
  owner: '',
  date: '2026-10-01',
  odometer: 92_900,
  liters: 40,
  amount: 70,
  price_per_liter: 1.75,
  notes: null,
  charge_type: 'fill',
  kwh: null,
  price_per_kwh: null,
  created_at: NOW,
};

describe('POST fills/add', () => {
  it('creates a fill like the real route and moves the odometer', () => {
    const state = seed();
    const result = commit(state, call(state, 'POST', 'fills/add', fill));
    expect(result.status).toBe(201);
    expect(result.json).toMatchObject({
      message: 'Plein ajouté avec succès',
      fill: { vehicle_id: 101, vehicle_name: '308 SW', fuel_type: 'Diesel', liters: 40 },
    });
    expect(state.vehicles.find((v) => v.id === DEMO_VEHICLE.peugeot308)?.odometer).toBe(92_900);
  });

  it('stores an electric charge without liters', () => {
    const result = call(seed(), 'POST', 'fills/add', {
      ...fill,
      vehicle_id: DEMO_VEHICLE.zoe,
      liters: 0,
      price_per_liter: 0,
      kwh: 40,
      price_per_kwh: 0.2276,
      charge_type: 'charge',
    });
    expect(result.json).toMatchObject({
      message: 'Recharge ajoutée avec succès',
      fill: { liters: null, kwh: 40 },
    });
  });

  it('validates input and vehicle rights', () => {
    const state = seed();
    expect(call(state, 'POST', 'fills/add', {})).toEqual({
      status: 400,
      json: { error: 'Le champ vehicle_id est requis' },
    });
    expect(call(state, 'POST', 'fills/add', { ...fill, vehicle_id: 999 }).status).toBe(404);
    expect(
      call(state, 'POST', 'fills/add', { ...fill, vehicle_id: DEMO_VEHICLE.peugeot208 }),
    ).toEqual({
      status: 403,
      json: { error: "Vous n'avez pas les droits pour ajouter une dépense à ce véhicule" },
    });
    expect(
      call(state, 'POST', 'fills/add', { ...fill, vehicle_id: DEMO_VEHICLE.niro }).status,
    ).toBe(201);
  });

  it("rejects an energy the vehicle can't use and a non-positive amount (same as the real route)", () => {
    const state = seed();
    expect(call(state, 'POST', 'fills/add', { ...fill, charge_type: 'charge', kwh: 30 })).toEqual({
      status: 400,
      json: { error: "Ce véhicule n'accepte pas les recharges électriques" },
    });
    expect(
      call(state, 'POST', 'fills/add', { ...fill, vehicle_id: DEMO_VEHICLE.zoe }).json,
    ).toEqual({ error: "Ce véhicule n'accepte pas les pleins de carburant" });
    expect(call(state, 'POST', 'fills/add', { ...fill, amount: 0 }).json).toEqual({
      error: 'Veuillez entrer un montant valide',
    });
  });
});

describe('PATCH fills/update', () => {
  it('updates a fill identified by its expense id (what the dashboard sends)', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'PATCH', 'fills/update', { ...fill, id: 10_059, amount: 99 }),
    );
    expect(result.status).toBe(200);
    expect(state.expenses.find((e) => e.id === 10_059)?.amount).toBe(99);
  });

  it('refuses a fill the viewer cannot edit', () => {
    expect(call(seed(), 'PATCH', 'fills/update', { ...fill, id: 40_000 }).status).toBe(403);
  });

  it('switches a plug-in hybrid fill to a charge', () => {
    const state = seed();
    const added = commit(
      state,
      call(state, 'POST', 'fills/add', { ...fill, vehicle_id: DEMO_VEHICLE.niro }),
    );
    const id = (added.json as { fill: { expense_id: number } }).fill.expense_id;
    const result = commit(
      state,
      call(state, 'PATCH', 'fills/update', {
        ...fill,
        id,
        vehicle_id: DEMO_VEHICLE.niro,
        charge_type: 'charge',
        kwh: 8,
        price_per_kwh: 0.25,
      }),
    );
    expect(result.json).toMatchObject({ fill: { liters: null, price_per_liter: 0, kwh: 8 } });
    expect(state.expenses.find((e) => e.id === id)?.type).toBe('electric_charge');
  });

  it('moves a fill to another writable vehicle, never to a read-only one', () => {
    const state = seed();
    expect(
      call(state, 'PATCH', 'fills/update', {
        ...fill,
        id: 10_059,
        vehicle_id: DEMO_VEHICLE.peugeot208,
      }),
    ).toEqual({
      status: 403,
      json: { error: "Vous n'êtes pas autorisé à déplacer cette dépense vers ce véhicule" },
    });
    commit(
      state,
      call(state, 'PATCH', 'fills/update', { ...fill, id: 10_059, vehicle_id: DEMO_VEHICLE.niro }),
    );
    expect(state.expenses.find((e) => e.id === 10_059)?.vehicle_id).toBe(DEMO_VEHICLE.niro);
  });
});

describe('expenses endpoints', () => {
  it('adds an "other" expense', () => {
    const state = seed();
    const body = { vehicle_id: 101, date: '2026-10-01', amount: 12, label: 'Lavage', notes: null };
    const result = commit(state, call(state, 'POST', 'expenses/other/add', body));
    expect(result.status).toBe(201);
    expect(result.json).toMatchObject({
      expense: { label: 'Lavage', vehicle_name: '308 SW', owner_id: DEMO_USER_ID },
    });
    expect(call(state, 'POST', 'expenses/other/add', { ...body, label: '' })).toEqual({
      status: 400,
      json: { error: 'Le champ label est requis' },
    });
  });

  it('updates a maintenance expense', () => {
    const state = seed();
    const ct = state.expenses.find(
      (e) => e.vehicle_id === 101 && e.maintenance?.maintenance_type_id === 'inspection',
    )!;
    const result = commit(
      state,
      call(state, 'PATCH', 'expenses/update', {
        id: ct.id,
        vehicle_id: 101,
        date: ct.date,
        amount: 80,
        notes: null,
        type: 'maintenance',
        maintenance_type: 'inspection',
        odometer: 60_000,
        garage: 'CT Express',
      }),
    );
    expect(result.status).toBe(200);
    expect(state.expenses.find((e) => e.id === ct.id)).toMatchObject({
      amount: 80,
      maintenance: { garage: 'CT Express', odometer: 60_000 },
    });
  });

  it('deletes an expense but never an insurance instalment', () => {
    const state = seed();
    expect(
      commit(state, call(state, 'DELETE', 'expenses/delete', { expenseId: 70_000 })).status,
    ).toBe(200);
    expect(state.expenses.some((e) => e.id === 70_000)).toBe(false);
    expect(call(state, 'DELETE', 'expenses/delete', { expenseId: 1_000_000 + 502 * 1000 })).toEqual(
      {
        status: 403,
        json: { error: "Les dépenses d'assurance ne peuvent pas être supprimées" },
      },
    );
    expect(call(state, 'DELETE', 'expenses/delete', { expenseId: 40_000 }).status).toBe(403);
  });
});

describe('maintenance endpoints', () => {
  it('adds a maintenance and creates the matching reminder', () => {
    const state = seed();
    const before = state.reminders.length;
    const result = commit(
      state,
      call(state, 'POST', 'maintenance/add', {
        vehicle_id: DEMO_VEHICLE.zoe,
        date: '2026-10-01',
        amount: 150,
        notes: null,
        maintenance_type: 'brakes',
        odometer: 39_000,
        garage: null,
      }),
    );
    expect(result.status).toBe(201);
    expect(result.json).toMatchObject({
      message: 'Entretien ajouté avec succès',
      expense: { maintenance_type: 'brakes' },
    });
    expect(state.reminders).toHaveLength(before + 1);
  });

  it('only deletes maintenance expenses', () => {
    const state = seed();
    expect(call(state, 'DELETE', 'maintenance/delete', { expenseId: 70_000 }).status).toBe(404);
    expect(call(state, 'DELETE', 'maintenance/delete', { expenseId: 60_000 }).status).toBe(200);
  });
});
