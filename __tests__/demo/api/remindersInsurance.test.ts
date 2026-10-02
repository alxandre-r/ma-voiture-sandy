// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dispatchDemoApi } from '@/lib/demo/api/router';
import { DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
import { addMonths, toTimestamp } from '@/lib/demo/dates';
import { applyOp } from '@/lib/demo/ops';
import { buildDemoSeed } from '@/lib/demo/seed';
import { expensesForDisplay } from '@/lib/demo/views';

import type { DemoApiResult } from '@/lib/demo/api/types';
import type { DemoState } from '@/lib/demo/types';

const NOW = '2026-10-01T10:00:00.000Z';
const seed = () => buildDemoSeed('2026-10-01');
const call = (state: DemoState, method: string, path: string, body: Record<string, unknown>) =>
  dispatchDemoApi(method, path, { state, body, query: new URLSearchParams(), now: NOW });
const commit = (state: DemoState, result: DemoApiResult) => {
  if (result.op) applyOp(state, result.op);
  return result;
};

// Same payload as ReminderForm (ReminderFormData)
const reminder = {
  vehicle_id: DEMO_VEHICLE.peugeot308,
  type: 'maintenance',
  title: 'Faire le plein de lave-glace',
  description: '',
  due_date: '2026-10-20',
  is_recurring: false,
};

describe('reminders endpoints', () => {
  it('creates a reminder on a writable vehicle', () => {
    const state = seed();
    const result = commit(state, call(state, 'POST', 'reminders/create', reminder));
    expect(result.status).toBe(201);
    expect(result.json).toMatchObject({
      reminder: { title: 'Faire le plein de lave-glace', user_id: DEMO_USER_ID, description: null },
    });
    expect(state.reminders.some((r) => r.title === 'Faire le plein de lave-glace')).toBe(true);
  });

  it('validates title, type and vehicle rights', () => {
    const state = seed();
    expect(call(state, 'POST', 'reminders/create', { ...reminder, title: ' ' })).toEqual({
      status: 400,
      json: { error: 'Le titre est requis' },
    });
    expect(call(state, 'POST', 'reminders/create', { ...reminder, type: 'x' }).status).toBe(400);
    expect(
      call(state, 'POST', 'reminders/create', { ...reminder, vehicle_id: DEMO_VEHICLE.peugeot208 }),
    ).toEqual({
      status: 403,
      json: { error: "Vous n'avez pas les droits pour ajouter un rappel à ce véhicule" },
    });
  });

  it('updates own reminders only', () => {
    const state = seed();
    expect(call(state, 'PATCH', 'reminders/update', { id: 706, title: 'x' })).toEqual({
      status: 403,
      json: { error: 'Non autorisé' },
    });
    commit(state, call(state, 'PATCH', 'reminders/update', { id: 702, title: 'Pneus à permuter' }));
    expect(state.reminders.find((r) => r.id === 702)?.title).toBe('Pneus à permuter');
  });

  it('completes a time-recurring reminder: next occurrence has a new date and no odometer', () => {
    const state = seed();
    const before = state.reminders.length;
    const old = state.reminders.find((r) => r.id === 701)!;
    // Stale fields that must not leak into the next occurrence
    old.due_odometer = 123_456;
    old.estimated_due_date = '2026-01-01T00:00:00.000Z';
    const result = commit(
      state,
      call(state, 'PATCH', 'reminders/complete', { id: 701, is_completed: true }),
    );
    expect(result.json).toMatchObject({ reminder: { id: 701, is_completed: true } });
    expect(state.reminders).toHaveLength(before + 1);
    const next = state.reminders[state.reminders.length - 1];
    expect(old.recurrence_type).toBe('time');
    expect(next.due_date).toBe(
      toTimestamp(addMonths(old.due_date!.slice(0, 10), old.recurrence_value!)),
    );
    expect(next.due_odometer).toBeNull();
    expect(next.estimated_due_date).toBeNull();
    expect(next.is_completed).toBe(false);
  });

  it('completes a km-recurring reminder: next occurrence has a new odometer and no date', () => {
    const state = seed();
    const old = state.reminders.find((r) => r.id === 703)!;
    old.due_date = '2026-01-01T00:00:00.000Z';
    old.estimated_due_date = '2026-01-01T00:00:00.000Z';
    commit(state, call(state, 'PATCH', 'reminders/complete', { id: 703, is_completed: true }));
    const next = state.reminders[state.reminders.length - 1];
    const odometer = state.vehicles.find((v) => v.id === old.vehicle_id)!.odometer;
    expect(old.recurrence_type).toBe('km');
    expect(next.due_odometer).toBe(odometer + old.recurrence_value!);
    expect(next.due_date).toBeNull();
    expect(next.estimated_due_date).toBeNull();
  });

  it('answers success on delete even when nothing matches, like the real route', () => {
    const state = seed();
    expect(call(state, 'DELETE', 'reminders/delete', { id: 999 })).toEqual({
      status: 200,
      json: { success: true },
    });
    expect(call(state, 'DELETE', 'reminders/delete', { id: 702 }).op).toEqual({
      t: 'reminder.delete',
      id: 702,
    });
  });
});

describe('insurance endpoints', () => {
  it('creates a non-overlapping contract; instalments are derived', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'POST', 'insurance/create', {
        vehicle_id: DEMO_VEHICLE.zoe,
        provider: ' Assur+ ',
        monthly_cost: 31,
        start_date: '2020-01-01',
        end_date: '2020-03-31',
      }),
    );
    expect(result.status).toBe(201);
    const contract = (result.json as { contract: { id: number; provider: string } }).contract;
    expect(contract.provider).toBe('Assur+');
    const instalments = expensesForDisplay(state).filter(
      (e) =>
        e.type === 'insurance' &&
        e.id >= 1_000_000 + contract.id * 1000 &&
        e.id < 1_000_000 + (contract.id + 1) * 1000,
    );
    expect(instalments.map((e) => e.date)).toEqual(['2020-01-01', '2020-02-01', '2020-03-01']);
  });

  it('rejects an overlapping contract with 409', () => {
    const state = seed();
    const result = call(state, 'POST', 'insurance/create', {
      vehicle_id: DEMO_VEHICLE.zoe,
      monthly_cost: 31,
      start_date: '2026-09-01',
    });
    expect(result.status).toBe(409);
    expect((result.json as { error: string }).error).toMatch(/^Ce contrat chevauche le contrat du /);
  });

  it('requires cost, start date and ownership', () => {
    const state = seed();
    const base = { vehicle_id: DEMO_VEHICLE.zoe, monthly_cost: 31, start_date: '2020-01-01' };
    expect(call(state, 'POST', 'insurance/create', { ...base, monthly_cost: 0 }).json).toEqual({
      error: 'Le coût mensuel est requis',
    });
    expect(call(state, 'POST', 'insurance/create', { ...base, start_date: '' }).json).toEqual({
      error: 'La date de début est requise',
    });
    expect(
      call(state, 'POST', 'insurance/create', { ...base, vehicle_id: DEMO_VEHICLE.niro }),
    ).toEqual({
      status: 404,
      json: { error: "Véhicule non trouvé ou vous n'êtes pas le propriétaire" },
    });
  });

  it('updates and deletes own contracts only; update rejects overlaps but not itself', () => {
    const state = seed();
    expect(call(state, 'PATCH', 'insurance/update', { id: 504, monthly_cost: 10 }).status).toBe(
      403,
    );
    // 502 is the open 308 contract: moving its start inside 501 overlaps
    expect(
      call(state, 'PATCH', 'insurance/update', { id: 502, start_date: '2024-10-01' }).status,
    ).toBe(409);
    expect(call(state, 'PATCH', 'insurance/update', { id: 502, monthly_cost: 40 }).status).toBe(
      200,
    );
    commit(state, call(state, 'PATCH', 'insurance/update', { id: 503, end_date: '2026-09-30' }));
    expect(state.insuranceContracts.find((c) => c.id === 503)?.end_date).toBe('2026-09-30');
    expect(commit(state, call(state, 'DELETE', 'insurance/delete', { id: 503 })).status).toBe(200);
    expect(state.insuranceContracts.some((c) => c.id === 503)).toBe(false);
  });

  it('changes a contract: closes the current one the day before and opens the new one', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'POST', 'insurance/change', {
        vehicle_id: DEMO_VEHICLE.peugeot308,
        monthly_cost: 49.9,
        effective_date: '2026-11-01',
      }),
    );
    expect(result.status).toBe(201);
    const created = (result.json as { contract: { id: number; provider: string } }).contract;
    expect(created.provider).toBe('Mutuelle des Routes');
    expect(state.insuranceContracts.find((c) => c.id === 502)?.end_date).toBe('2026-10-31');
    expect(state.insuranceContracts.find((c) => c.id === created.id)).toMatchObject({
      start_date: '2026-11-01',
      end_date: null,
      monthly_cost: 49.9,
      owner_id: DEMO_USER_ID,
    });
  });

  it('refuses a change when a contract already starts later, and on family vehicles', () => {
    const state = seed();
    // Seeded Zoé already has an upcoming contract (506)
    expect(
      call(state, 'POST', 'insurance/change', {
        vehicle_id: DEMO_VEHICLE.zoe,
        monthly_cost: 30,
        effective_date: '2026-10-15',
      }),
    ).toEqual({
      status: 409,
      json: {
        error: 'Un contrat commence déjà à cette date ou après. Modifiez-le ou supprimez-le.',
      },
    });
    expect(
      call(state, 'POST', 'insurance/change', {
        vehicle_id: DEMO_VEHICLE.niro,
        monthly_cost: 30,
        effective_date: '2026-11-01',
      }).status,
    ).toBe(404);
  });
});
