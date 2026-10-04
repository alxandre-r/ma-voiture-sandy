// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Chainable query builder resolving to `result`; records every call on `calls`. */
function builder(result: unknown, calls: string[]) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'insert', 'update', 'upsert', 'delete']) {
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
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: (t: string) => {
      state.calls.push(`from(${t})`);
      return builder(state.rows[t] ?? { data: null, error: null }, state.calls);
    },
  }),
}));

import { POST as addVehicle } from '@/app/api/vehicles/add/route';
import { POST as setPermissions } from '@/app/api/vehicles/permissions/route';
import { PATCH as updateVehicle } from '@/app/api/vehicles/update/route';

const request = (body: string) =>
  new Request('http://localhost/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
const json = (body: unknown) => request(JSON.stringify(body));

/** What VehicleForm submits for a new vehicle with the optional fields left empty. */
const formPayload = {
  name: '',
  make: 'Peugeot',
  model: '208',
  year: 2019,
  plate: 'ab-123-cd',
  vin: '',
  status: 'active',
  fuel_type: 'gasoline',
  transmission: 'manual',
  odometer: 54000,
  image: '',
  color: '#f97316',
  tech_control_expiry: '',
  purchase_date: '',
  financing_mode: 'owned',
};

beforeEach(() => {
  state.user = { id: 'u1' };
  state.rows = {};
  state.calls = [];
});

describe('vehicles routes body validation', () => {
  it('answers 400 on invalid JSON', async () => {
    const res = await addVehicle(request('{"make":'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Requête invalide' });
    expect(state.calls).toEqual([]);
  });

  it('rejects an unknown status', async () => {
    const res = await addVehicle(json({ ...formPayload, status: 'stolen' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Statut invalide' });
    expect(state.calls).toEqual([]);
  });

  it('keeps the fuel type message', async () => {
    const res = await addVehicle(json({ ...formPayload, fuel_type: 'steam' }));
    expect(await res.json()).toEqual({ error: 'Type de carburant invalide' });
  });

  it('rejects a malformed vehicle id and a bad date on update', async () => {
    const badId = await updateVehicle(json({ vehicle_id: 'abc', odometer: 1 }));
    expect(badId.status).toBe(400);
    expect(await badId.json()).toEqual({ error: 'Le champ vehicle_id est requis' });

    const badDate = await updateVehicle(json({ vehicle_id: 4, purchase_date: '2026-13-01' }));
    expect(badDate.status).toBe(400);
    expect(await badDate.json()).toEqual({ error: "Date d'achat invalide" });
    expect(state.calls).toEqual([]);
  });

  it('rejects a permission entry whose userId is not a uuid', async () => {
    const res = await setPermissions(
      json({ vehicleId: 4, permissions: [{ userId: 'bob', level: 'read' }] }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Niveau de permission invalide' });
  });

  it('lets the VehicleForm payload reach the DB', async () => {
    state.rows.vehicles = { data: { id: 1 }, error: null };
    const res = await addVehicle(json(formPayload));
    expect(res.status).toBe(200);
    const insert = state.calls.find((c) => c.startsWith('insert('));
    expect(insert).toContain('"plate":"AB-123-CD"');
    expect(insert).toContain('"purchase_date":null');
  });

  it('accepts the inline odometer update', async () => {
    state.rows.vehicles = { data: { id: 4, owner_id: 'u1' }, error: null };
    const res = await updateVehicle(json({ vehicle_id: 4, odometer: 61000 }));
    expect(res.status).toBe(200);
    expect(state.calls).toContain('update({"odometer":61000})');
  });
});
