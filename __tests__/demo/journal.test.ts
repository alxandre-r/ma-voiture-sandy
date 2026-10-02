// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { DEMO_COOKIE_MAX_BYTES } from '@/lib/demo/constants';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';
import { createRandom } from '@/lib/demo/random';

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
