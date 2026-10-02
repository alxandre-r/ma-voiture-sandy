// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { handleDemoApiRequest } from '@/lib/demo/api/handleRequest';
import { DEMO_COOKIE_MAX_BYTES, DEMO_MAX_OPS, DEMO_VEHICLE } from '@/lib/demo/constants';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';
import { createRandom } from '@/lib/demo/random';

import type { DemoOp } from '@/lib/demo/ops';

const NOW = new Date('2026-10-01T10:00:00Z');
const fillBody = {
  vehicle_id: DEMO_VEHICLE.peugeot308,
  date: '2026-10-01',
  odometer: 92_900,
  liters: 40,
  amount: 70,
  price_per_liter: 1.75,
  charge_type: 'fill',
};

function request(method: string, path: string, rawCookie: string | undefined, body = {}) {
  return handleDemoApiRequest({
    method,
    path,
    rawCookie,
    body,
    query: new URLSearchParams(),
    now: NOW,
  });
}

describe('handleDemoApiRequest', () => {
  it('rejects requests without a demo cookie', () => {
    expect(request('GET', 'expenses/get', undefined).status).toBe(401);
  });

  it('persists a mutation in the returned cookie and replays it on the next request', () => {
    const first = request('POST', 'fills/add', encodeJournal(createJournal('s1')), fillBody);
    expect(first.status).toBe(201);
    expect(first.cookie).toBeDefined();
    expect(decodeJournal(first.cookie!).ops).toHaveLength(1);

    const read = handleDemoApiRequest({
      method: 'GET',
      path: 'expenses/get',
      rawCookie: first.cookie,
      body: {},
      query: new URLSearchParams({ vehicleIds: `${DEMO_VEHICLE.peugeot308}` }),
      now: NOW,
    });
    const { expenses } = read.json as { expenses: { id: number }[] };
    const createdId = (first.json as { fill: { expense_id: number } }).fill.expense_id;
    expect(expenses.some((e) => e.id === createdId)).toBe(true);
  });

  it('does not touch the cookie for reads and errors', () => {
    expect(
      request('GET', 'expenses/get', encodeJournal(createJournal('s'))).cookie,
    ).toBeUndefined();
    expect(
      request('POST', 'fills/add', encodeJournal(createJournal('s')), {}).cookie,
    ).toBeUndefined();
  });

  it('refuses a mutation that would overflow the cookie (Review Focus #2)', () => {
    const random = createRandom(3);
    const noise = () =>
      Array.from({ length: 300 }, () => String.fromCharCode(97 + random.int(0, 25))).join('');
    // 15 ops: still a valid cookie, but one more fill pushes it past the limit
    const ops: DemoOp[] = Array.from({ length: 15 }, () => ({
      t: 'profile.update',
      name: noise(),
    }));
    const raw = encodeJournal({ sessionId: 's', ops });
    expect(raw.length).toBeLessThan(DEMO_COOKIE_MAX_BYTES);

    const result = request('POST', 'fills/add', raw, fillBody);
    expect(result).toEqual({
      status: 409,
      json: {
        error: 'Limite de la démo atteinte : réinitialisez-la depuis le bandeau pour continuer.',
      },
    });
    expect(result.cookie).toBeUndefined();
  });

  it('refuses a mutation that would exceed the op cap, so the next decode never resets the demo', () => {
    const ops: DemoOp[] = Array.from({ length: DEMO_MAX_OPS }, () => ({
      t: 'profile.update',
      name: 'Camille',
    }));
    const raw = encodeJournal({ sessionId: 's', ops });
    expect(raw.length).toBeLessThan(DEMO_COOKIE_MAX_BYTES);

    const result = request('POST', 'fills/add', raw, fillBody);
    expect(result.status).toBe(409);
    expect(result.cookie).toBeUndefined();
  });
});
