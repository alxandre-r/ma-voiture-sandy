// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dispatchDemoApi } from '@/lib/demo/api/router';
import { DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
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

  it('completes a recurring reminder and schedules the next one', () => {
    const state = seed();
    const before = state.reminders.length;
    const result = commit(
      state,
      call(state, 'PATCH', 'reminders/complete', { id: 701, is_completed: true }),
    );
    expect(result.json).toMatchObject({ reminder: { id: 701, is_completed: true } });
    expect(state.reminders).toHaveLength(before + 1);
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
  it('creates a contract on an owned vehicle; instalments are derived', () => {
    const state = seed();
    const result = commit(
      state,
      call(state, 'POST', 'insurance/create', {
        vehicle_id: DEMO_VEHICLE.zoe,
        provider: ' Assur+ ',
        monthly_cost: 31,
        start_date: '2026-09-01',
        end_date: '',
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
    expect(instalments.map((e) => e.date)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('requires cost, start date and ownership', () => {
    const state = seed();
    const base = { vehicle_id: DEMO_VEHICLE.zoe, monthly_cost: 31, start_date: '2026-09-01' };
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

  it('updates and deletes own contracts only', () => {
    const state = seed();
    expect(call(state, 'PATCH', 'insurance/update', { id: 504, monthly_cost: 10 }).status).toBe(
      403,
    );
    commit(state, call(state, 'PATCH', 'insurance/update', { id: 503, end_date: '2026-09-30' }));
    expect(state.insuranceContracts.find((c) => c.id === 503)?.end_date).toBe('2026-09-30');
    expect(commit(state, call(state, 'DELETE', 'insurance/delete', { id: 503 })).status).toBe(200);
    expect(state.insuranceContracts.some((c) => c.id === 503)).toBe(false);
  });
});
