// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

/** Each `from(table)` query pops the next queued result for that table; calls are recorded. */
const db = vi.hoisted(() => ({
  queue: {} as Record<string, Result[]>,
  calls: [] as string[],
  canWrite: true,
}));

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'insert', 'update', 'delete']) {
    b[m] = (...args: unknown[]) => {
      db.calls.push(`${table}.${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return b;
    };
  }
  const next = async () => db.queue[table]?.shift() ?? { data: null, error: null };
  b.single = next;
  b.maybeSingle = next;
  b.then = (resolve: (v: unknown) => unknown) => next().then(resolve);
  return b;
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/vehicleAccess', () => ({ canWriteRow: async () => db.canWrite }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: string) => builder(table),
  }),
}));

import { PATCH as completeReminder } from '@/app/api/reminders/complete/route';
import { DELETE as deleteReminder } from '@/app/api/reminders/delete/route';

const json = (body: unknown) =>
  new Request('http://localhost/api/reminders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const recurring = {
  id: 7,
  user_id: 'partner',
  vehicle_id: 3,
  type: 'maintenance',
  title: 'Révision',
  description: null,
  due_date: '2026-10-10T00:00:00.000Z',
  due_odometer: null,
  is_recurring: true,
  recurrence_type: 'time',
  recurrence_value: 12,
  maintenance_type_id: 'revision',
};

const inserts = () => db.calls.filter((c) => c.startsWith('reminders.insert('));

beforeEach(() => {
  db.queue = {};
  db.calls = [];
  db.canWrite = true;
});

describe('reminders/complete (B13)', () => {
  it('completes a recurring reminder once and schedules the next occurrence', async () => {
    db.queue.reminders = [
      { data: { ...recurring, is_completed: false }, error: null },
      { data: { ...recurring, is_completed: true }, error: null },
    ];
    const res = await completeReminder(json({ id: 7, is_completed: true }));
    expect(res.status).toBe(200);
    expect(inserts()).toHaveLength(1);
    expect(db.calls).toContain('reminders.not("is_completed","is",true)');
  });

  it('is idempotent: re-completing a completed reminder creates no second occurrence', async () => {
    db.queue.reminders = [{ data: { ...recurring, is_completed: true }, error: null }];
    const res = await completeReminder(json({ id: 7, is_completed: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ reminder: { id: 7, is_completed: true } });
    expect(db.calls.some((c) => c.startsWith('reminders.update('))).toBe(false);
    expect(inserts()).toHaveLength(0);
  });

  it('creates no occurrence when a concurrent request toggled it first', async () => {
    db.queue.reminders = [
      { data: { ...recurring, is_completed: false }, error: null },
      { data: null, error: null },
    ];
    const res = await completeReminder(json({ id: 7, is_completed: true }));
    expect(res.status).toBe(200);
    expect(inserts()).toHaveLength(0);
  });

  it('answers 403 to a user without write rights on the vehicle', async () => {
    db.canWrite = false;
    db.queue.reminders = [{ data: { ...recurring, is_completed: false }, error: null }];
    const res = await completeReminder(json({ id: 7, is_completed: true }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Non autorisé' });
    expect(db.calls.some((c) => c.startsWith('reminders.update('))).toBe(false);
  });

  it('keeps the 404 message for an unknown reminder', async () => {
    const res = await completeReminder(json({ id: 99, is_completed: true }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Rappel introuvable' });
  });
});

describe('reminders/delete (B13)', () => {
  it('deletes a reminder the user can write', async () => {
    db.queue.reminders = [
      { data: { id: 7, user_id: 'partner', vehicle_id: 3 }, error: null },
      { data: [{ id: 7 }], error: null },
    ];
    const res = await deleteReminder(json({ id: 7 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('answers 403 instead of a silent success without write rights', async () => {
    db.canWrite = false;
    db.queue.reminders = [{ data: { id: 7, user_id: 'partner', vehicle_id: 3 }, error: null }];
    const res = await deleteReminder(json({ id: 7 }));
    expect(res.status).toBe(403);
    expect(db.calls.some((c) => c.startsWith('reminders.delete('))).toBe(false);
  });

  it('answers 403 when RLS deleted nothing', async () => {
    db.queue.reminders = [
      { data: { id: 7, user_id: 'partner', vehicle_id: 3 }, error: null },
      { data: [], error: null },
    ];
    expect((await deleteReminder(json({ id: 7 }))).status).toBe(403);
  });

  it('answers 404 for an unknown reminder', async () => {
    const res = await deleteReminder(json({ id: 99 }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Rappel introuvable' });
  });
});
