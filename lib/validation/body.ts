/**
 * @file lib/validation/body.ts
 * @description Dependency-free request-body validation for API routes (P3.6).
 * Each `check()` yields a French error message or null; `firstError()` keeps the first one.
 *
 * @example
 * const body = await readJsonObject(request);
 * if (!body) return badRequest(INVALID_BODY);
 * const error = firstError(
 *   check(isId(body.vehicle_id), 'Le champ vehicle_id est requis'),
 *   check(isPositiveNumber(body.amount), 'Le montant doit être supérieur à 0'),
 * );
 * if (error) return badRequest(error);
 */
import { NextResponse } from 'next/server';

export type JsonBody = Record<string, unknown>;

export const INVALID_BODY = 'Requête invalide';

/** Parses a JSON object body; null for invalid JSON, arrays and primitives. */
export async function readJsonObject(request: Request): Promise<JsonBody | null> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as JsonBody)
      : null;
  } catch {
    return null;
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function check(valid: boolean, message: string): string | null {
  return valid ? null : message;
}

export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}

// ─── Predicates ─────────────────────────────────────────────────────────────

/** undefined, null or '' (an empty form field). */
export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** A number, or a numeric string as forms send them. */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

/** Positive integer id (bigint columns), as a number or a digit string. */
export function isId(value: unknown): boolean {
  const n = toNumber(value);
  return Number.isSafeInteger(n) && n > 0;
}

export function isUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function isPositiveNumber(value: unknown): boolean {
  const n = toNumber(value);
  return Number.isFinite(n) && n > 0;
}

export function isNonNegativeNumber(value: unknown): boolean {
  const n = toNumber(value);
  return Number.isFinite(n) && n >= 0;
}

/** A real calendar date `YYYY-MM-DD` (a time part is allowed and ignored). */
export function isIsoDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Non-empty (after trim) string of at most `max` characters. */
export function isText(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

/** Blank, or a string of at most `max` characters. */
export function isOptionalText(value: unknown, max: number): boolean {
  return isBlank(value) || (typeof value === 'string' && value.length <= max);
}

/** Wraps a predicate so that blank values pass (optional fields). */
export function optional(predicate: (value: unknown) => boolean) {
  return (value: unknown) => isBlank(value) || predicate(value);
}
