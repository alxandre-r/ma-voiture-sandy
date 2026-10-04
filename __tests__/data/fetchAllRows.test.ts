import { describe, expect, it, vi } from 'vitest';

import { fetchAllRows, PAGE_SIZE } from '@/lib/data/fetchAllRows';

/** Fake paged source over `total` rows, recording the requested ranges. */
function source(total: number, failAt?: number) {
  const ranges: [number, number][] = [];
  const page = vi.fn(async (from: number, to: number) => {
    ranges.push([from, to]);
    if (failAt !== undefined && from >= failAt) return { data: null, error: { message: 'boom' } };
    const rows = Array.from(
      { length: Math.max(0, Math.min(to, total - 1) - from + 1) },
      (_, i) => from + i,
    );
    return { data: rows, error: null };
  });
  return { page, ranges };
}

describe('fetchAllRows', () => {
  it('makes a single request below the page size', async () => {
    const { page, ranges } = source(125);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(125);
    expect(ranges).toEqual([[0, PAGE_SIZE - 1]]);
  });

  it('reads past the 1000-row cap instead of silently truncating', async () => {
    const { page, ranges } = source(2 * PAGE_SIZE + 5);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(2 * PAGE_SIZE + 5);
    expect(data?.[2 * PAGE_SIZE + 4]).toBe(2 * PAGE_SIZE + 4);
    expect(ranges.map(([from]) => from)).toEqual([0, PAGE_SIZE, 2 * PAGE_SIZE]);
  });

  it('asks for one extra (empty) page when the total is an exact multiple', async () => {
    const { page, ranges } = source(PAGE_SIZE);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(PAGE_SIZE);
    expect(ranges).toHaveLength(2);
  });

  it('returns the error and no partial data when a page fails', async () => {
    const { page } = source(3 * PAGE_SIZE, PAGE_SIZE);
    expect(await fetchAllRows(page)).toEqual({ data: null, error: { message: 'boom' } });
  });
});
