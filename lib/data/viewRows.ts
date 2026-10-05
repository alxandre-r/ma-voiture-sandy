/**
 * Rows of a database view, typed as the app's domain type (`Vehicle`, `Expense`…).
 *
 * The generated types (`types/database.ts`) make every view column nullable and type the jsonb
 * aggregates (e.g. `attachments`) as `Json`, so a view row never matches a domain type on its own.
 * This is the one place where that assertion is made; tables need no cast.
 */
export function viewRows<T>(data: readonly object[] | null): T[] {
  return (data ?? []) as unknown as T[];
}

/** Same as `viewRows`, for a `.single()` / `.maybeSingle()` read. */
export function viewRow<T>(row: object | null): T | null {
  return row as unknown as T | null;
}
