/**
 * @file lib/data/fetchAllRows.ts
 * @description Reads every row of a list query, page by page (P3.7).
 * PostgREST caps a response at `max-rows` (1000 by default on Supabase) WITHOUT any error, so an
 * unpaged `select` silently drops the oldest rows once a user's vehicles pass that count, and
 * every total built on it is wrong. One request while the list is under PAGE_SIZE.
 * The query must have a total order (add `.order('id')` after the business order), otherwise
 * pages can skip or repeat rows.
 */

export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

/** `page(from, to)` must return the query with `.range(from, to)` applied. */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
