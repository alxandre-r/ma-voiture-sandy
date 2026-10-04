// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Minimal chainable query builder resolving to `result`; records calls on `calls`. */
function builder(result: unknown, calls: string[]) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'delete']) {
    b[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return b;
    };
  }
  b.maybeSingle = async () => result;
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  userRows: {} as Record<string, unknown>,
  adminRows: {} as Record<string, unknown>,
  userCalls: [] as string[],
  adminCalls: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (t: string) => builder(state.userRows[t] ?? { data: null, error: null }, state.userCalls),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (t: string) => {
      state.adminCalls.push(`from(${t})`);
      return builder(state.adminRows[t] ?? { data: null, error: null }, state.adminCalls);
    },
  }),
}));

import { GET as getByToken } from '@/app/api/family/getByInvitToken/route';
import { DELETE as removeMember } from '@/app/api/family/members/[userId]/route';

beforeEach(() => {
  state.user = { id: 'owner' };
  state.userRows = {};
  state.adminRows = {};
  state.userCalls = [];
  state.adminCalls = [];
});

describe('GET /api/family/getByInvitToken', () => {
  const call = (token = 'tok') =>
    getByToken(new Request(`http://localhost/api/family/getByInvitToken?token=${token}`));

  it('returns 401 without a user and never touches the admin client', async () => {
    state.user = null;
    expect((await call()).status).toBe(401);
    expect(state.adminCalls).toEqual([]);
  });

  it('looks the family up with the admin client (a non-member cannot read it under RLS)', async () => {
    const family = { id: 'f1', name: 'Les Dupont', created_at: '2026-01-01', owner_id: 'o1' };
    state.adminRows.families = { data: family, error: null };
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...family, owner_user: null });
    expect(state.adminCalls).toContain('eq("invite_token","tok")');
  });

  it('returns 404 for an unknown token', async () => {
    expect((await call('nope')).status).toBe(404);
  });
});

describe('DELETE /api/family/members/[userId]', () => {
  const call = (userId = 'member') =>
    removeMember(new Request(`http://localhost/api/family/members/${userId}?familyId=f1`), {
      params: { userId },
    });

  it('returns 401 without a user', async () => {
    state.user = null;
    expect((await call()).status).toBe(401);
  });

  it('returns 403 when the caller is not the family owner, without deleting', async () => {
    state.userRows.family_members = { data: { family_id: 'f1', role: 'member' }, error: null };
    expect((await call()).status).toBe(403);
    expect(state.adminCalls).toEqual([]);
  });

  it("lets the owner remove another member's row through the admin client", async () => {
    state.userRows.family_members = { data: { family_id: 'f1', role: 'owner' }, error: null };
    const res = await call();
    expect(res.status).toBe(200);
    expect(state.adminCalls).toEqual([
      'from(family_members)',
      'delete()',
      'eq("family_id","f1")',
      'eq("user_id","member")',
    ]);
  });
});
