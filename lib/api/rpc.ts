/**
 * @file lib/api/rpc.ts
 * @description Typed calls to the transactional RPCs (__info__/migrations/2026-10-04-05-data-integrity.sql).
 * The generated types make every function argument non-null and type jsonb as `Json`; these
 * wrappers take the shapes the routes build and return the shapes of `types/rpc.ts`.
 */
import type { Database, Json } from '@/types/database';
import type { SavedExpense } from '@/types/rpc';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/** Values come from a parsed JSON body or from literals, so they are JSON-safe by construction. */
const asJson = (value: Record<string, unknown> | null) => value as Json;

/**
 * `save_expense_with_detail`: inserts (`expenseId` null) or updates an expense and its
 * fills / maintenance_expenses / other_expenses row in one transaction.
 */
export async function saveExpenseWithDetail<Detail = Record<string, unknown>>(
  supabase: SupabaseClient<Database>,
  expenseId: number | null,
  expense: Record<string, unknown>,
  detail: Record<string, unknown> | null,
): Promise<{ saved: SavedExpense<Detail>; error: PostgrestError | null }> {
  const { data, error } = await supabase.rpc('save_expense_with_detail', {
    p_expense_id: expenseId as number, // NULL = insert (SQL accepts it, the generated type does not)
    p_expense: asJson(expense),
    p_detail: asJson(detail),
  });
  // `saved` is only meaningful when `error` is null
  return { saved: data as unknown as SavedExpense<Detail>, error };
}
