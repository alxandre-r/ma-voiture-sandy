/**
 * @file lib/api/dbErrors.ts
 * @description Turns a Supabase/Postgres error into a French API response (P3.16).
 * Errors a user can actually cause (quotas, bad input) become a 4xx with a clear message;
 * anything else answers 500 with the route's own fallback, never the raw database text.
 */
import { NextResponse } from 'next/server';

/** Postgres SQLSTATE raised by RLS violations and by our triggers' permission checks */
const INSUFFICIENT_PRIVILEGE = '42501';

/** Substring of the database message → what the user sees (RAISE texts live in the DB triggers) */
const KNOWN_ERRORS: Array<{ match: string; status: number; error: string }> = [
  {
    match: 'Attachment limit per entity reached',
    status: 409,
    error: 'Limite atteinte : 10 pièces jointes maximum par élément',
  },
  {
    match: 'Attachment limit per user reached',
    status: 409,
    error: 'Limite atteinte : 200 pièces jointes maximum par compte',
  },
  {
    match: 'invalid input syntax for type date',
    status: 400,
    error: 'Format de date invalide pour un des champs de date',
  },
  { match: 'null value in column "make"', status: 400, error: 'La marque est requise' },
  { match: 'null value in column "model"', status: 400, error: 'Le modèle est requis' },
];

export function dbErrorResponse(
  dbError: { message?: string; code?: string },
  fallback: string,
): NextResponse {
  const message = dbError.message ?? '';
  const known = KNOWN_ERRORS.find((k) => message.includes(k.match));
  if (known) return NextResponse.json({ error: known.error }, { status: known.status });
  if (dbError.code === INSUFFICIENT_PRIVILEGE) {
    return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
