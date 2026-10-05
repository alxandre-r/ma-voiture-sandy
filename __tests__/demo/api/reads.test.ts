// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dispatchDemoApi } from '@/lib/demo/api/router';
import { DEMO_VEHICLE } from '@/lib/demo/constants';
import { buildDemoSeed } from '@/lib/demo/seed';

const NOW = '2026-10-01T10:00:00.000Z';
const get = (path: string, params: Record<string, string> = {}) =>
  dispatchDemoApi('GET', path, {
    state: buildDemoSeed('2026-10-01'),
    body: {},
    query: new URLSearchParams(params),
    now: NOW,
  });

describe('demo read endpoints', () => {
  it('GET expenses/get returns the requested vehicles, newest first', () => {
    const { status, json } = get('expenses/get', { vehicleIds: `${DEMO_VEHICLE.zoe}` });
    const { expenses } = json as { expenses: { vehicle_id: number; date: string }[] };
    expect(status).toBe(200);
    expect(expenses.length).toBeGreaterThan(50);
    expect(expenses.every((e) => e.vehicle_id === DEMO_VEHICLE.zoe)).toBe(true);
    expect(expenses[0].date >= expenses[1].date).toBe(true);
  });

  it('GET search finds owned-vehicle expenses and own reminders', () => {
    expect((get('search', { q: 'a' }).json as { expenses: unknown[] }).expenses).toEqual([]);
    const { json } = get('search', { q: 'péage' });
    const { expenses } = json as { expenses: { vehicle_name: string }[] };
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses.length).toBeLessThanOrEqual(8);
    expect(expenses.every((e) => e.vehicle_name !== 'Niro')).toBe(true); // not owned
    const reminders = (get('search', { q: 'contrôle' }).json as { reminders: { id: number }[] })
      .reminders;
    expect(reminders.map((r) => r.id)).toEqual([701]);
  });

  it('GET vehicles/permissions is owner-only', () => {
    expect(get('vehicles/permissions', { vehicleId: `${DEMO_VEHICLE.niro}` }).status).toBe(403);
    const { json } = get('vehicles/permissions', { vehicleId: `${DEMO_VEHICLE.zoe}` });
    expect((json as { data: unknown[] }).data).toHaveLength(2);
  });

  it('answers 501 for endpoints the demo does not emulate', () => {
    expect(get('users/me')).toEqual({
      status: 501,
      json: { error: "Cette action n'est pas disponible dans la démo." },
    });
  });
});
