// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

const db = vi.hoisted(() => ({
  rpc: {} as Record<string, Result>,
  rpcCalls: [] as { name: string; args: unknown }[],
  users: { data: { name: 'Alex', email: 'old@mail.fr' }, error: null } as Result,
  userUpdates: [] as unknown[],
  authUpdates: [] as unknown[],
  removed: [] as { bucket: string; names: string[] }[],
  removeError: null as unknown,
  deleteUserError: null as unknown,
}));

function rpc(name: string, args: unknown) {
  db.rpcCalls.push({ name, args });
  return Promise.resolve(db.rpc[name] ?? { data: null, error: null });
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'me' } }, error: null }),
      updateUser: async (attrs: unknown) => {
        db.authUpdates.push(attrs);
        return { error: null };
      },
      signOut: async () => ({ error: null }),
    },
    rpc,
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) q[m] = () => q;
      q.single = async () => db.users;
      q.update = (values: unknown) => {
        db.userUpdates.push(values);
        return { eq: async () => ({ error: null }) };
      };
      return q;
    },
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { deleteUser: async () => ({ error: db.deleteUserError }) } },
    rpc,
    storage: {
      from: (bucket: string) => ({
        remove: async (names: string[]) => {
          db.removed.push({ bucket, names });
          return { error: db.removeError };
        },
      }),
    },
  }),
}));

import { POST as deleteAccount } from '@/app/api/auth/delete-account/route';
import { POST as updateProfile } from '@/app/api/users/update-profile/route';
import { getFamilyVisibilityPrefs } from '@/lib/data/user/getFamilyVisibilityPrefs';

beforeEach(() => {
  db.rpc = {};
  db.rpcCalls = [];
  db.userUpdates = [];
  db.authUpdates = [];
  db.removed = [];
  db.removeError = null;
  db.deleteUserError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getFamilyVisibilityPrefs (P3.11)', () => {
  it('reads the flags of every member in one RPC call, keyed by user', async () => {
    db.rpc.get_family_visibility_prefs = {
      data: [
        {
          user_id: 'b',
          show_consumption: false,
          show_insurance: true,
          show_vehicle_details: true,
          show_financials: false,
        },
      ],
      error: null,
    };
    const prefs = await getFamilyVisibilityPrefs(['b', 'a', 'b']);
    expect(db.rpcCalls).toEqual([
      { name: 'get_family_visibility_prefs', args: { p_user_ids: ['a', 'b'] } },
    ]);
    expect(prefs).toEqual({
      b: {
        show_consumption: false,
        show_insurance: true,
        show_vehicle_details: true,
        show_financials: false,
      },
    });
  });

  it('is secondary data: an error means "show everything" ({}), and no ids means no call', async () => {
    db.rpc.get_family_visibility_prefs = { data: null, error: { message: 'boom' } };
    expect(await getFamilyVisibilityPrefs(['a'])).toEqual({});
    expect(await getFamilyVisibilityPrefs([])).toEqual({});
    expect(db.rpcCalls).toHaveLength(1);
  });
});

describe('POST /api/users/update-profile (P3.19)', () => {
  const post = (body: unknown) =>
    updateProfile(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('asks Auth to change the email but never writes it to public.users', async () => {
    const res = await post({ name: 'Alex', email: 'new@mail.fr' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.emailPending).toBe(true);
    expect(body.message).toContain('new@mail.fr');
    expect(db.authUpdates).toEqual([{ email: 'new@mail.fr' }]);
    expect(db.userUpdates).toEqual([]);
  });

  it('still writes a name change directly', async () => {
    const res = await post({ name: 'Alexandre', email: 'old@mail.fr' });
    expect((await res.json()).emailPending).toBeUndefined();
    expect(db.userUpdates).toEqual([{ name: 'Alexandre' }]);
  });
});

describe('POST /api/auth/delete-account (P3.18)', () => {
  it('removes the leftover files, grouped by bucket, after deleting the account', async () => {
    db.rpc.orphaned_user_storage_objects = {
      data: [
        { bucket_id: 'avatars', name: 'me/avatar.jpg' },
        { bucket_id: 'attachments', name: 'me/expense_1/a.pdf' },
        { bucket_id: 'attachments', name: 'me/expense_2/b.pdf' },
      ],
      error: null,
    };
    const res = await deleteAccount();
    expect(res.status).toBe(200);
    expect(db.rpcCalls).toEqual([
      { name: 'orphaned_user_storage_objects', args: { p_user_id: 'me' } },
    ]);
    expect(db.removed).toEqual([
      { bucket: 'avatars', names: ['me/avatar.jpg'] },
      { bucket: 'attachments', names: ['me/expense_1/a.pdf', 'me/expense_2/b.pdf'] },
    ]);
  });

  it('a failed file cleanup does not fail the deletion; a failed deletion touches no file', async () => {
    db.rpc.orphaned_user_storage_objects = {
      data: [{ bucket_id: 'avatars', name: 'me/a.jpg' }],
      error: null,
    };
    db.removeError = { message: 'storage down' };
    expect((await deleteAccount()).status).toBe(200);

    db.removed = [];
    db.rpcCalls = [];
    db.deleteUserError = { message: 'fk violation' };
    expect((await deleteAccount()).status).toBe(500);
    expect(db.rpcCalls).toEqual([]);
    expect(db.removed).toEqual([]);
  });
});
