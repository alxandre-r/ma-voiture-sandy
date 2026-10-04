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
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (t: string) => {
      state.calls.push(`admin.from(${t})`);
      return builder({ data: null, error: null }, state.calls);
    },
  }),
}));

import { POST as createFamily } from '@/app/api/family/create/route';
import { POST as joinFamily } from '@/app/api/family/join/route';
import { PATCH as updateFamily } from '@/app/api/family/update/route';

const FAMILY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const request = (body: string) =>
  new Request('http://localhost/api/family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

beforeEach(() => {
  state.user = { id: 'u1' };
  state.rows = {};
  state.calls = [];
});

describe('family routes body validation', () => {
  it('answers 400 on invalid JSON without touching the DB', async () => {
    const res = await createFamily(request('{not json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Requête invalide' });
    expect(state.calls).toEqual([]);
  });

  it('keeps 401 before 400 when there is no user', async () => {
    state.user = null;
    expect((await createFamily(request('{not json'))).status).toBe(401);
  });

  it('rejects a non-string family name with the existing message', async () => {
    const res = await createFamily(request(JSON.stringify({ name: 42 })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Le nom de la famille est requis' });
  });

  it('rejects a familyId that is not a uuid', async () => {
    const res = await updateFamily(request(JSON.stringify({ familyId: '1; drop', name: 'X' })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "L'ID de la famille est requis" });
    expect(state.calls).toEqual([]);
  });

  it('rejects an oversized invite token', async () => {
    const res = await joinFamily(request(JSON.stringify({ token: 'x'.repeat(101) })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Token d'invitation invalide" });
    expect(state.calls).toEqual([]);
  });

  it('lets a valid payload reach the DB', async () => {
    state.rows.families = { data: { id: FAMILY_ID, name: 'Les Dupont' }, error: null };
    const res = await createFamily(request(JSON.stringify({ name: '  Les Dupont ' })));
    expect(res.status).toBe(201);
    expect(state.calls).toContain('insert([{"name":"Les Dupont","owner_id":"u1"}])');
  });
});
