// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Chainable query builder resolving to `result`; records every call on `calls`. */
function builder(result: unknown, calls: string[]) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'upsert']) {
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
  user: null as { id: string; email: string } | null,
  calls: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: (t: string) => {
      state.calls.push(`from(${t})`);
      return builder({ data: null, error: null }, state.calls);
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

import { POST as signUp } from '@/app/api/auth/sign-up/route';
import { POST as changePassword } from '@/app/api/users/change-password/route';
import { PATCH as updatePreferences } from '@/app/api/users/preferences/route';
import { POST as updateProfile } from '@/app/api/users/update-profile/route';

const request = (body: string) =>
  new Request('http://localhost/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
const json = (body: unknown) => request(JSON.stringify(body));

beforeEach(() => {
  state.user = { id: 'u1', email: 'a@b.fr' };
  state.calls = [];
});

describe('users routes body validation', () => {
  it('answers 400 on invalid JSON', async () => {
    const res = await updatePreferences(request(''));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Requête invalide' });
    expect(state.calls).toEqual([]);
  });

  it('rejects a non-string name on update-profile', async () => {
    const res = await updateProfile(json({ name: 42, email: 'a@b.fr' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Nom invalide' });
    expect(state.calls).toEqual([]);
  });

  it('rejects a new password longer than 72 characters', async () => {
    const res = await changePassword(json({ oldPassword: 'secret1', newPassword: 'x'.repeat(73) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Le mot de passe ne doit pas dépasser 72 caractères',
    });
  });

  it('keeps the existing min-length message', async () => {
    const res = await changePassword(json({ oldPassword: 'secret1', newPassword: 'abc' }));
    expect(await res.json()).toEqual({
      error: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
    });
  });

  it('rejects a malformed email on sign-up before touching the admin client', async () => {
    const res = await signUp(json({ name: 'Ana', email: 'not-an-email', password: 'secret1' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Adresse email invalide' });
    expect(state.calls).toEqual([]);
  });

  it('lets valid preferences reach the DB', async () => {
    const res = await updatePreferences(json({ show_insurance: false, default_period: 'year' }));
    expect(res.status).toBe(200);
    expect(state.calls).toContain('from(user_preferences)');
  });
});
