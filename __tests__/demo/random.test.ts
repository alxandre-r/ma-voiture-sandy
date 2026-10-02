import { describe, expect, it } from 'vitest';

import { createRandom, round } from '@/lib/demo/random';

describe('demo random', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('stays within the requested bounds', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const value = random.between(1.5, 2.5);
      expect(value).toBeGreaterThanOrEqual(1.5);
      expect(value).toBeLessThan(2.5);
      const integer = random.int(-2, 2);
      expect(integer).toBeGreaterThanOrEqual(-2);
      expect(integer).toBeLessThanOrEqual(2);
    }
  });

  it('rounds to a number of decimals', () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(41.005, 1)).toBe(41);
  });
});
