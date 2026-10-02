// @vitest-environment node
import { deflateRawSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { DEMO_COOKIE_MAX_BYTES, DEMO_MAX_OPS } from '@/lib/demo/constants';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';
import { createRandom } from '@/lib/demo/random';
import { buildDemoState } from '@/lib/demo/state';

import type { DemoOp } from '@/lib/demo/ops';

describe('demo journal', () => {
  it('round-trips a journal', () => {
    const journal = {
      sessionId: 'abc',
      ops: [{ t: 'profile.update', name: 'Camille' } satisfies DemoOp],
    };
    expect(decodeJournal(encodeJournal(journal))).toEqual(journal);
  });

  it('produces a cookie-safe value', () => {
    expect(encodeJournal(createJournal('abc'))).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });

  it('recovers an empty journal from garbage, unknown versions and bad ops', () => {
    expect(decodeJournal('not-a-journal').ops).toEqual([]);
    expect(decodeJournal('v9.AAAA').ops).toEqual([]);
    expect(decodeJournal('v1.%%%').ops).toEqual([]);
    const withBadOp = encodeJournal({
      sessionId: 's',
      ops: [{ t: 'drop.tables' } as unknown as DemoOp],
    });
    expect(decodeJournal(withBadOp)).toEqual({ sessionId: 's', ops: [] });
  });

  it('fits at least 40 realistic edits under the cookie limit', () => {
    const random = createRandom(1);
    const ops: DemoOp[] = Array.from({ length: 40 }, (_, i) => ({
      t: 'fill.add',
      id: 11_000 + i,
      at: new Date(Date.UTC(2026, 9, 1, 8, i)).toISOString(),
      d: {
        vehicle_id: 101,
        date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
        amount: Math.round(random.between(40, 90) * 100) / 100,
        notes: i % 3 === 0 ? 'Plein sur autoroute' : null,
        odometer: 92_400 + i * 650,
        charge_type: 'fill',
        liters: Math.round(random.between(30, 50) * 100) / 100,
        price_per_liter: Math.round(random.between(1.6, 1.9) * 1000) / 1000,
        kwh: null,
        price_per_kwh: null,
      },
    }));
    expect(encodeJournal({ sessionId: crypto.randomUUID(), ops }).length).toBeLessThan(
      DEMO_COOKIE_MAX_BYTES,
    );
  });
});

describe('demo journal: tampered cookie caps', () => {
  const maintenanceOp: DemoOp = {
    t: 'maintenance.add',
    id: 10_000,
    at: '2026-10-01T08:00:00.000Z',
    d: {
      vehicle_id: 101,
      date: '2026-09-01',
      amount: 80,
      notes: null,
      maintenance_type: 'oil_change',
      odometer: 92_000,
      garage: null,
    },
  };

  // Encoder called directly: the server never issues such cookies, an attacker can craft them
  const craft = (count: number) =>
    encodeJournal({
      sessionId: 'attacker',
      ops: Array.from({ length: count }, () => maintenanceOp),
    });
  const crafted4000 = craft(4_000);
  // Fits the size cap: only the op cap can stop this one
  const craftedUnderSizeCap = craft(3_400);

  it('crafts a 3 400-op cookie that fits the cookie size limit', () => {
    expect(craftedUnderSizeCap.length).toBeLessThanOrEqual(DEMO_COOKIE_MAX_BYTES);
  });

  it.each([
    ['4 000 ops', crafted4000],
    ['3 400 ops under the size cap', craftedUnderSizeCap],
  ])('recovers an empty journal from a crafted cookie of %s', (_label, cookie) => {
    expect(decodeJournal(cookie)).toEqual({ sessionId: 'recovered', ops: [] });
  });

  it.each([
    ['4 000 ops', crafted4000],
    ['3 400 ops under the size cap', craftedUnderSizeCap],
  ])('decodes and replays a crafted cookie of %s in under 50 ms', (_label, cookie) => {
    // Warm-up: the first seed build pays JIT costs unrelated to the journal
    buildDemoState('2026-10-02', []);
    const started = performance.now();
    buildDemoState('2026-10-02', decodeJournal(cookie).ops);
    expect(performance.now() - started).toBeLessThan(50);
  });

  it('accepts a journal of exactly DEMO_MAX_OPS ops', () => {
    const ops = Array.from({ length: DEMO_MAX_OPS }, () => maintenanceOp);
    expect(decodeJournal(encodeJournal({ sessionId: 's', ops })).ops).toHaveLength(DEMO_MAX_OPS);
  });

  it('recovers an empty journal when the raw cookie is longer than the cookie limit', () => {
    const valid = encodeJournal({ sessionId: 's', ops: [maintenanceOp] });
    const oversized = valid + 'A'.repeat(DEMO_COOKIE_MAX_BYTES);
    expect(decodeJournal(oversized)).toEqual({ sessionId: 'recovered', ops: [] });
  });

  it('recovers an empty journal when the payload inflates past 128 KB', () => {
    // Valid JSON once inflated: 200 KB of whitespace inside the op array
    const json = `{"s":"s","o":[${' '.repeat(200 * 1024)}]}`;
    const bomb = `v1.${deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url')}`;
    expect(bomb.length).toBeLessThan(DEMO_COOKIE_MAX_BYTES);
    expect(decodeJournal(bomb)).toEqual({ sessionId: 'recovered', ops: [] });
  });
});
