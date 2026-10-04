/**
 * @file lib/data/loadError.ts
 * @description Error contract of the lib/data fetchers (P3.8).
 *
 * - Data the page is about (vehicles, expenses, reminders, maintenance, insurance, families,
 *   the user's info): a query error THROWS through failLoad(), so the route's error.tsx shows
 *   it. Returning null / [] instead looks like "no data": the dashboard crashed on it (B6) and a
 *   user with vehicles could be sent to the onboarding page.
 * - Secondary data (preferences, badge counts, avatars, labels, visibility flags): log and fall
 *   back to defaults; the page still works without it.
 * - No signed-in user is not an error: fetchers return empty and AppDataProvider redirects.
 *
 * Next.js replaces Server Component error messages in production, so error.tsx shows a fixed
 * French text; this message is for the server logs and development.
 */
export function failLoad(what: string, error: unknown): never {
  console.error(`[lib/data] Impossible de charger ${what}:`, error);
  throw new Error(`Impossible de charger ${what}`);
}

/** PostgREST "no rows" for `.single()`: a missing row, not a failure. */
export const NO_ROWS = 'PGRST116';
