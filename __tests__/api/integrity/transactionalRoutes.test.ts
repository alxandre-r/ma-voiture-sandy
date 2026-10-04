// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

const db = vi.hoisted(() => ({
  user: { id: 'me' } as { id: string } | null,
  /** Per-table results, consumed in order when a list is given (one per query). */
  tables: {} as Record<string, Result | Result[]>,
  rpcResults: {} as Record<string, Result>,
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
}));

/** Chainable builder: every filter returns itself; awaiting or single() yields the table's result. */
function builder(table: string) {
  const entry = db.tables[table];
  const result: Result = Array.isArray(entry)
    ? (entry.shift() ?? { data: null, error: null })
    : (entry ?? { data: null, error: null });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'delete', 'update', 'insert', 'order']) b[m] = () => b;
  b.single = async () => result;
  b.maybeSingle = async () => result;
  b.then = (resolve: (v: Result) => unknown) => resolve(result);
  return b;
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/utils/odometer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/odometer')>()),
  raiseVehicleOdometer: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: (table: string) => builder(table),
    rpc: async (name: string, args: Record<string, unknown>) => {
      db.rpcCalls.push({ name, args });
      return db.rpcResults[name] ?? { data: null, error: null };
    },
  }),
}));

import { DELETE as deleteExpense } from '@/app/api/expenses/delete/route';
import { PATCH as updateExpense } from '@/app/api/expenses/update/route';
import { POST as addFill } from '@/app/api/fills/add/route';
import { POST as createInsurance } from '@/app/api/insurance/create/route';
import { DELETE as deleteInsurance } from '@/app/api/insurance/delete/route';

const json = (method: string, body: unknown) =>
  new Request('http://localhost/api/x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const gasCar = {
  vehicle_id: 1,
  owner_id: 'me',
  name: 'Clio',
  fuel_type: 'gasoline',
  permission_level: null,
};

beforeEach(() => {
  db.user = { id: 'me' };
  db.tables = {};
  db.rpcResults = {};
  db.rpcCalls = [];
});

describe('POST /api/fills/add', () => {
  const fill = {
    vehicle_id: 1,
    date: '2026-10-01',
    amount: 60,
    liters: 35,
    price_per_liter: 1.7,
    odometer: 12000,
  };

  it('rejects invalid JSON and bad fields before touching the DB', async () => {
    expect((await addFill(json('POST', 'nope'))).status).toBe(400);
    const res = await addFill(json('POST', { ...fill, date: '2026-02-30' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Veuillez entrer une date valide');
    expect(db.rpcCalls).toEqual([]);
  });

  it('writes expense and fill through one RPC call', async () => {
    db.tables.vehicles_for_display = { data: gasCar, error: null };
    db.rpcResults.save_expense_with_detail = {
      data: { expense: { id: 9 }, detail: { id: 3, expense_id: 9, odometer: 12000 } },
      error: null,
    };
    const res = await addFill(json('POST', fill));
    expect(res.status).toBe(201);
    expect(db.rpcCalls).toHaveLength(1);
    expect(db.rpcCalls[0].args).toMatchObject({
      p_expense_id: null,
      p_expense: { vehicle_id: 1, type: 'fuel', amount: 60, date: '2026-10-01' },
      p_detail: {
        odometer: 12000,
        liters: 35,
        price_per_liter: 1.7,
        charge_type: 'fill',
        kwh: null,
      },
    });
    expect((await res.json()).fill).toMatchObject({ id: 3, vehicle_id: 1, vehicle_name: 'Clio' });
  });

  it('keeps the error message when the transaction fails (nothing to roll back by hand)', async () => {
    db.tables.vehicles_for_display = { data: gasCar, error: null };
    db.rpcResults.save_expense_with_detail = { data: null, error: { message: 'boom' } };
    const res = await addFill(json('POST', fill));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Erreur lors de l'ajout du plein");
  });
});

describe('PATCH /api/expenses/update', () => {
  it('lets the vehicle owner edit a maintenance a family member logged (P3.9)', async () => {
    db.tables.expenses = {
      data: { id: 5, owner_id: 'member', vehicle_id: 1, type: 'maintenance' },
      error: null,
    };
    db.tables.vehicles_for_display = { data: { owner_id: 'me', permission_level: null }, error: null };
    db.rpcResults.save_expense_with_detail = {
      data: { expense: { id: 5, vehicle_id: 1 }, detail: {} },
      error: null,
    };
    const res = await updateExpense(
      json('PATCH', { id: 5, amount: 80, maintenance_type: 'oil', garage: '', odometer: 50000 }),
    );
    expect(res.status).toBe(200);
    expect(db.rpcCalls[0]).toEqual({
      name: 'save_expense_with_detail',
      args: {
        p_expense_id: 5,
        p_expense: { amount: 80 },
        p_detail: { maintenance_type_id: 'oil', odometer: 50000, garage: null },
      },
    });
    // the auto-reminder refresh stays a separate call
    expect(db.rpcCalls[1].name).toBe('update_maintenance_reminder');
  });

  it('never sends a NULL label for other expenses', async () => {
    db.tables.expenses = { data: { id: 6, owner_id: 'me', vehicle_id: 1, type: 'other' }, error: null };
    db.rpcResults.save_expense_with_detail = {
      data: { expense: { id: 6 }, detail: null },
      error: null,
    };
    await updateExpense(json('PATCH', { id: 6, amount: 10, label: null }));
    expect(db.rpcCalls[0].args.p_detail).toBeNull();
  });

  it('refuses a user who is neither creator, vehicle owner nor writer', async () => {
    db.tables.expenses = { data: { id: 5, owner_id: 'other', vehicle_id: 1, type: 'fuel' }, error: null };
    db.tables.vehicles_for_display = {
      data: { owner_id: 'other', permission_level: 'read' },
      error: null,
    };
    expect((await updateExpense(json('PATCH', { id: 5, amount: 1 }))).status).toBe(403);
    expect(db.rpcCalls).toEqual([]);
  });
});

describe('DELETE /api/expenses/delete', () => {
  it('returns 403 when RLS silently deletes nothing', async () => {
    db.tables.expenses = [
      { data: { id: 5, owner_id: 'me', vehicle_id: 1, type: 'fuel' }, error: null }, // lookup
      { data: [], error: null }, // delete … select('id')
    ];
    expect((await deleteExpense(json('DELETE', { expenseId: 5 }))).status).toBe(403);
  });

  it('deletes only the expense row (details cascade)', async () => {
    db.tables.expenses = [
      { data: { id: 5, owner_id: 'me', vehicle_id: 1, type: 'fuel' }, error: null },
      { data: [{ id: 5 }], error: null },
    ];
    expect((await deleteExpense(json('DELETE', { expenseId: 5 }))).status).toBe(200);
  });
});

describe('insurance RPCs', () => {
  it('create: contract and instalments in one call', async () => {
    db.tables.vehicles = { data: { id: 1 }, error: null };
    db.tables.insurance_contracts = { data: [], error: null };
    db.rpcResults.save_insurance_contract = { data: { id: 77 }, error: null };
    const res = await createInsurance(
      json('POST', { vehicle_id: 1, monthly_cost: 40, start_date: '2026-08-15', provider: '  MAIF ' }),
    );
    expect(res.status).toBe(201);
    const { args } = db.rpcCalls[0];
    expect(args.p_contract).toEqual({
      vehicle_id: 1,
      monthly_cost: 40,
      start_date: '2026-08-15',
      end_date: null,
      provider: 'MAIF',
    });
    expect((args.p_instalments as string[])[0]).toBe('2026-08-15');
  });

  it('delete: one RPC; false (nothing deleted) is an error', async () => {
    db.tables.insurance_contracts = { data: { id: 77, owner_id: 'me' }, error: null };
    db.rpcResults.delete_insurance_contract = { data: false, error: null };
    const res = await deleteInsurance(json('DELETE', { id: 77 }));
    expect(res.status).toBe(500);
    expect(db.rpcCalls).toEqual([{ name: 'delete_insurance_contract', args: { p_id: 77 } }]);
  });
});
