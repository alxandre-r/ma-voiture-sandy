// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: { code?: string; message: string } | null };

const db = vi.hoisted(() => ({ result: { data: null, error: null } as Result }));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) },
    from: () => {
      const query: Record<string, unknown> = {};
      for (const m of ['select', 'in', 'eq', 'or', 'order', 'range']) query[m] = () => query;
      query.single = async () => db.result;
      query.then = (resolve: (v: Result) => unknown) => resolve(db.result);
      return query;
    },
  }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

import { getAllExpenses } from '@/lib/data/expenses/getAllExpenses';
import { getFamilyInfo } from '@/lib/data/family/getFamilyInfo';
import { getReminders } from '@/lib/data/reminders/getReminders';
import { getCurrentUserInfo } from '@/lib/data/user/getCurrentUserInfo';

const failure = { data: null, error: { code: '08006', message: 'connection failure' } };

beforeEach(() => {
  db.result = { data: null, error: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('lib/data error contract (P3.8)', () => {
  it('main data throws instead of looking like "no data" (B6)', async () => {
    db.result = failure;
    await expect(getAllExpenses([1])).rejects.toThrow('Impossible de charger les dépenses');
    await expect(getReminders()).rejects.toThrow('Impossible de charger les rappels');
  });

  it('a successful empty result is still an empty list, never null', async () => {
    db.result = { data: [], error: null };
    expect(await getAllExpenses([1])).toEqual([]);
  });

  it('a missing row (PGRST116) is null, not an error', async () => {
    db.result = { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    expect(await getFamilyInfo('f1')).toBeNull();
    expect(await getCurrentUserInfo()).toBeNull();
  });

  it("a DB failure on the user's profile reaches error.tsx instead of faking an expired session", async () => {
    db.result = failure;
    await expect(getCurrentUserInfo()).rejects.toThrow('Impossible de charger votre profil');
  });
});
