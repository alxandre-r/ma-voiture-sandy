// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as Array<[string, unknown[]]>);

vi.mock('@/lib/supabase/server', () => {
  // Chainable fake of the Supabase query builder; `.or(...)` ends the chain
  const builder: Record<string, (...args: unknown[]) => unknown> = new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        (...args: unknown[]) => {
          calls.push([method, args]);
          return method === 'or'
            ? Promise.resolve({
                data: [{ vehicle_id: 101 }, { vehicle_id: 104 }, { vehicle_id: 101 }],
                error: null,
              })
            : builder;
        },
    },
  );
  return {
    createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'camille' } } }) },
      from: (table: string) => {
        calls.push(['from', [table]]);
        return builder;
      },
    }),
  };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

import { getActiveInsuranceVehicleIds } from '@/lib/data/insurance/getActiveInsuranceVehicleIds';

describe('getActiveInsuranceVehicleIds', () => {
  it('counts active contracts held by any family member', async () => {
    await expect(getActiveInsuranceVehicleIds([101, 104])).resolves.toEqual([101, 104]);
    expect(calls).toContainEqual(['from', ['insurance_contracts']]);
    expect(calls.some(([method, args]) => method === 'eq' && args[0] === 'owner_id')).toBe(false);
  });
});
