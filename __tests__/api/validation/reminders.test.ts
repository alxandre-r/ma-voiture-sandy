// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Chainable query builder resolving to `result`; records every call on `calls`. */
function builder(result: unknown, calls: string[]) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'delete']) {
    b[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return b;
    };
  }
  b.single = async () => result;
  b.maybeSingle = async () => result;
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rows: {} as Record<string, unknown>,
  calls: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (t: string) => {
      state.calls.push(`from(${t})`);
      return builder(state.rows[t] ?? { data: null, error: null }, state.calls);
    },
  }),
}));

import { PATCH as completeReminder } from '@/app/api/reminders/complete/route';
import { POST as createReminder } from '@/app/api/reminders/create/route';
import { PATCH as updateReminder } from '@/app/api/reminders/update/route';

const request = (body: string) =>
  new Request('http://localhost/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
const json = (body: unknown) => request(JSON.stringify(body));

beforeEach(() => {
  state.user = { id: 'u1' };
  state.rows = {};
  state.calls = [];
});

describe('reminders routes body validation', () => {
  it('answers 400 on invalid JSON and on a non-object body', async () => {
    const res = await completeReminder(request('nope'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Requête invalide' });
    expect((await completeReminder(json([1, 2]))).status).toBe(400);
    expect(state.calls).toEqual([]);
  });

  it('keeps the existing message for an unknown type', async () => {
    const res = await createReminder(json({ title: 'Vidange', type: 'party' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Le type est requis' });
  });

  it('rejects an impossible due date before any DB call', async () => {
    const res = await createReminder(
      json({ title: 'Vidange', type: 'maintenance', due_date: '2026-02-30' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Date d'échéance invalide" });
    expect(state.calls).toEqual([]);
  });

  it('rejects an unknown recurrence type on update', async () => {
    const res = await updateReminder(json({ id: 3, recurrence_type: 'weeks' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Type de récurrence invalide' });
    expect(state.calls).toEqual([]);
  });

  it('rejects a non-numeric id with the existing message', async () => {
    const res = await updateReminder(json({ id: 'abc' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "L'identifiant est requis" });
  });

  it('accepts the payload ReminderForm sends (no vehicle, blank optional fields)', async () => {
    state.rows.reminders = { data: { id: 9 }, error: null };
    const res = await createReminder(
      json({
        vehicle_id: null,
        type: 'custom',
        title: ' Pneus hiver ',
        due_date: '2026-11-15',
        is_recurring: true,
        recurrence_type: 'time',
        recurrence_value: 12,
      }),
    );
    expect(res.status).toBe(201);
    expect(state.calls).toContain('from(reminders)');
    expect(state.calls.find((c) => c.startsWith('insert('))).toContain('"title":"Pneus hiver"');
  });
});
