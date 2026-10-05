// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A family created by someone else, which the vehicle owner joined as a plain member
const CREATOR = '00000000-0000-4000-8000-000000000001';
const MEMBER = '00000000-0000-4000-8000-000000000002'; // owns vehicle 4, not a family creator
const PARTNER = '00000000-0000-4000-8000-000000000003'; // same family as MEMBER
const STRANGER = '00000000-0000-4000-8000-000000000004'; // another family

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  user: null as { id: string } | null,
  tables: {} as Record<string, Row[]>,
  writes: [] as string[],
}));

/** Minimal PostgREST stand-in: select with eq/in filters, records upserts and deletes. */
function query(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  let write: string | null = null;
  const q: Record<string, unknown> = {
    select: () => q,
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return q;
    },
    in: (column: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[column]));
      return q;
    },
    upsert: (rows: Row[]) => {
      write = `upsert ${table} ${JSON.stringify(rows)}`;
      return q;
    },
    delete: () => {
      write = `delete ${table}`;
      return q;
    },
  };
  const rows = () => (db.tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
  q.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null });
  q.then = (resolve: (v: unknown) => unknown) => {
    if (write) {
      db.writes.push(write);
      return resolve({ data: null, error: null });
    }
    return resolve({ data: rows(), error: null });
  };
  return q;
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user }, error: null }) },
    from: (table: string) => query(table),
  }),
}));

import { POST as setPermissions } from '@/app/api/vehicles/permissions/route';

const post = (permissions: { userId: string; level: string }[]) =>
  setPermissions(
    new Request('http://localhost/api/vehicles/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: 4, permissions }),
    }),
  );

beforeEach(() => {
  db.user = { id: MEMBER };
  db.writes = [];
  db.tables = {
    vehicles: [{ id: 4, owner_id: MEMBER }],
    family_members: [
      { family_id: 'f1', user_id: CREATOR },
      { family_id: 'f1', user_id: MEMBER },
      { family_id: 'f1', user_id: PARTNER },
      { family_id: 'f2', user_id: STRANGER },
    ],
  };
});

describe('POST /api/vehicles/permissions — vehicle owner who did not create the family', () => {
  it('can share the vehicle with a member of a family they joined', async () => {
    const res = await post([
      { userId: PARTNER, level: 'write' },
      { userId: CREATOR, level: 'read' },
    ]);
    expect(res.status).toBe(200);
    expect(db.writes).toEqual([
      `upsert vehicle_permissions ${JSON.stringify([
        { vehicle_id: 4, user_id: PARTNER, permission_level: 'write' },
        { vehicle_id: 4, user_id: CREATOR, permission_level: 'read' },
      ])}`,
    ]);
  });

  it('still refuses users outside their families', async () => {
    const res = await post([{ userId: STRANGER, level: 'read' }]);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Certains utilisateurs ne font pas partie de votre famille',
    });
    expect(db.writes).toEqual([]);
  });

  it('refuses any grant when the owner belongs to no family', async () => {
    db.tables.family_members = db.tables.family_members.filter((m) => m.user_id !== MEMBER);
    const res = await post([{ userId: PARTNER, level: 'read' }]);
    expect(res.status).toBe(403);
    expect(db.writes).toEqual([]);
  });

  it('still requires owning the vehicle', async () => {
    db.user = { id: PARTNER };
    const res = await post([{ userId: CREATOR, level: 'read' }]);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Véhicule introuvable ou accès refusé' });
  });
});
