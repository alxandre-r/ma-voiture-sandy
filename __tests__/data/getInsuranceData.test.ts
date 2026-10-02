// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const tables = vi.hoisted(() => ({
  insurance_contracts: [
    { id: 1, vehicle_id: 10, start_date: '2024-01-01', end_date: '2024-12-31', monthly_cost: '40' },
    { id: 2, vehicle_id: 10, start_date: '2025-01-01', end_date: null, monthly_cost: '45.5' },
    { id: 3, vehicle_id: 20, start_date: '2025-01-01', end_date: null, monthly_cost: '30' },
  ] as Record<string, unknown>[],
  attachments: [
    { id: 9, entity_type: 'insurance_contract', entity_id: 2, is_deleted: false },
  ] as Record<string, unknown>[],
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: keyof typeof tables) => {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const query = {
        select: () => query,
        in: (col: string, values: unknown[]) => {
          filters.push((r) => values.includes(r[col]));
          return query;
        },
        eq: (col: string, value: unknown) => {
          filters.push((r) => r[col] === value);
          return query;
        },
        order: () => query,
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: tables[table].filter((r) => filters.every((f) => f(r))), error: null }),
      };
      return query;
    },
  }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock('@/lib/data/user/getPreferencesByUserId', () => ({
  getPreferencesByUserId: async (id: string) => (id === 'shy' ? { show_insurance: false } : null),
}));

import { getInsuranceData } from '@/lib/data/insurance/getInsuranceData';

describe('getInsuranceData', () => {
  it('returns visible contracts with their attachments and hides opted-out owners', async () => {
    const data = await getInsuranceData([
      { vehicle_id: 10, owner_id: 'me' },
      { vehicle_id: 20, owner_id: 'shy' },
    ]);
    expect(data.hiddenVehicleIds).toEqual([20]);
    expect(data.contracts.map((c) => c.id)).toEqual([2, 1]);
    expect(data.contracts[0].monthly_cost).toBe(45.5);
    expect(data.contracts[0].attachments?.map((a) => a.id)).toEqual([9]);
    expect(data.contracts[1].attachments).toEqual([]);
  });

  it('returns an empty payload for no vehicles', async () => {
    await expect(getInsuranceData([])).resolves.toEqual({ contracts: [], hiddenVehicleIds: [] });
  });
});
