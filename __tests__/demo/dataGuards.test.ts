// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({ factory: vi.fn() }));
const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: supabase.factory }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'mv_demo' && cookie.value !== undefined ? { name, value: cookie.value } : undefined,
  }),
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

import { DEMO_FAMILY_ID, DEMO_USER_ID } from '@/lib/demo/constants';
import * as demoData from '@/lib/demo/data';
import { toISODate } from '@/lib/demo/dates';
import { createJournal, encodeJournal } from '@/lib/demo/journal';
import { buildDemoState } from '@/lib/demo/state';

const IDS = [101, 102, 103, 104];

const FETCHERS: Array<[string, () => Promise<unknown>]> = [
  [
    'getAllExpenses',
    async () => (await import('@/lib/data/expenses/getAllExpenses')).getAllExpenses(IDS),
  ],
  [
    'getFillExpenses',
    async () => (await import('@/lib/data/expenses/getFillExpenses')).getFillExpenses(IDS),
  ],
  [
    'getFamilyInfo',
    async () => (await import('@/lib/data/family/getFamilyInfo')).getFamilyInfo(DEMO_FAMILY_ID),
  ],
  [
    'getFamilyMembers',
    async () =>
      (await import('@/lib/data/family/getFamilyMembers')).getFamilyMembers(DEMO_FAMILY_ID),
  ],
  [
    'getUserFamilies',
    async () => (await import('@/lib/data/family/getUserFamilies')).getUserFamilies(),
  ],
  [
    'getInsuranceData',
    async () =>
      (await import('@/lib/data/insurance/getInsuranceData')).getInsuranceData(
        IDS.map((vehicle_id) => ({ vehicle_id, owner_id: DEMO_USER_ID })),
      ),
  ],
  [
    'getMaintenanceExpenses (maintenance)',
    async () =>
      (await import('@/lib/data/maintenance/getMaintenanceExpenses')).getMaintenanceExpenses(IDS),
  ],
  [
    'getMaintenanceTypes',
    async () => (await import('@/lib/data/maintenance/getMaintenanceTypes')).getMaintenanceTypes(),
  ],
  [
    'getOverdueCount',
    async () => (await import('@/lib/data/reminders/getOverdueCount')).getOverdueCount(),
  ],
  [
    'getReminders',
    async () => (await import('@/lib/data/reminders/getReminders')).getReminders(IDS),
  ],
  ['getCurrentUser', async () => (await import('@/lib/data/user/getCurrentUser')).getCurrentUser()],
  [
    'getCurrentUserInfo',
    async () => (await import('@/lib/data/user/getCurrentUserInfo')).getCurrentUserInfo(),
  ],
  [
    'getFamilyVisibilityPrefs',
    async () =>
      (await import('@/lib/data/user/getFamilyVisibilityPrefs')).getFamilyVisibilityPrefs([
        DEMO_USER_ID,
      ]),
  ],
  [
    'getUserFamilyIds',
    async () => (await import('@/lib/data/user/getUserFamilyIds')).getUserFamilyIds(),
  ],
  [
    'getUserPreferences',
    async () => (await import('@/lib/data/user/getUserPreferences')).getUserPreferences(),
  ],
  [
    'getFamilyVehicles',
    async () =>
      (await import('@/lib/data/vehicles/getFamilyVehicles')).getFamilyVehicles(DEMO_FAMILY_ID),
  ],
  [
    'getFamilyAllVehicles',
    async () =>
      (await import('@/lib/data/vehicles/getFamilyVehicles')).getFamilyAllVehicles(DEMO_FAMILY_ID),
  ],
  [
    'getFamilyVehiclesMinimal',
    async () =>
      (await import('@/lib/data/vehicles/getFamilyVehicles')).getFamilyVehiclesMinimal(
        DEMO_FAMILY_ID,
      ),
  ],
  [
    'getUserVehicles',
    async () => (await import('@/lib/data/vehicles/getUserVehicles')).getUserVehicles(),
  ],
  [
    'getUserVehiclesMinimal',
    async () => (await import('@/lib/data/vehicles/getUserVehicles')).getUserVehiclesMinimal(),
  ],
];

function demoState() {
  return buildDemoState(toISODate(new Date()), createJournal('test-session').ops);
}

beforeEach(() => {
  supabase.factory.mockReset();
  supabase.factory.mockImplementation(() => {
    throw new Error('Supabase must never be reached in demo mode');
  });
  cookie.value = encodeJournal(createJournal('test-session'));
});

describe('lib/data in demo mode', () => {
  it('covers the 20 fetchers', () => {
    expect(FETCHERS).toHaveLength(20);
  });

  it.each(FETCHERS)('%s answers from demo data without touching Supabase', async (_name, call) => {
    if (_name === 'getCurrentUser') {
      await expect(call()).resolves.toBeNull();
    } else {
      await expect(call()).resolves.not.toBeUndefined();
    }
    expect(supabase.factory).not.toHaveBeenCalled();
  });

  it('returns the values computed from the demo state', async () => {
    const state = demoState();
    const { getOverdueCount } = await import('@/lib/data/reminders/getOverdueCount');
    await expect(getOverdueCount()).resolves.toEqual(demoData.getOverdueCount(state));

    const { getUserVehicles } = await import('@/lib/data/vehicles/getUserVehicles');
    const vehicles = await getUserVehicles();
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles.map((v) => v.vehicle_id)).toEqual(
      demoData.getUserVehicles(state).map((v) => v.vehicle_id),
    );
    expect(vehicles.every((v) => v.owner_id === DEMO_USER_ID)).toBe(true);

    const { getUserFamilyIds } = await import('@/lib/data/user/getUserFamilyIds');
    await expect(getUserFamilyIds()).resolves.toEqual([DEMO_FAMILY_ID]);
  });

  it('returns the demo user from getCurrentUserInfo (null would redirect to session_expired)', async () => {
    const { getCurrentUserInfo } = await import('@/lib/data/user/getCurrentUserInfo');
    const user = await getCurrentUserInfo();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(DEMO_USER_ID);
    expect(supabase.factory).not.toHaveBeenCalled();
  });

  it('still uses Supabase outside the demo', async () => {
    cookie.value = undefined;
    supabase.factory.mockImplementation(async () => ({
      auth: { getUser: async () => ({ data: { user: null } }) },
    }));
    const { getUserPreferences } = await import('@/lib/data/user/getUserPreferences');
    await expect(getUserPreferences()).resolves.toBeNull();
    expect(supabase.factory).toHaveBeenCalled();
  });
});
