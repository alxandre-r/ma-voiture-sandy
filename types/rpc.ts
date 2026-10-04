/**
 * @file types/rpc.ts
 * @description Return shapes of the transactional RPCs (__info__/migrations/2026-10-04-05-data-integrity.sql).
 */

/** `save_expense_with_detail`: the expense row and its fills / maintenance_expenses / other_expenses row. */
export interface SavedExpense<Detail = Record<string, unknown>> {
  expense: Record<string, unknown> & { id: number };
  detail: Detail | null;
}
