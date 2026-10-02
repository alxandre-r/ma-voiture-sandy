/**
 * @file lib/demo/constants.ts
 * @description Shared constants of the free-access demo. Edge-safe (imported by middleware.tsx).
 */

/** Cookie holding the demo journal. Its presence switches the whole app to demo mode. */
export const DEMO_COOKIE = 'mv_demo';
export const DEMO_JOURNAL_VERSION = 'v1';
/** Max size of the encoded cookie value (browsers cap one cookie at ~4096 bytes). */
export const DEMO_COOKIE_MAX_BYTES = 3800;

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'; // Camille
export const DEMO_PARTNER_ID = '00000000-0000-4000-8000-000000000002'; // Thomas
export const DEMO_DAUGHTER_ID = '00000000-0000-4000-8000-000000000003'; // Léa
export const DEMO_FAMILY_ID = '00000000-0000-4000-8000-0000000000f1';
export const DEMO_INVITE_TOKEN = 'DEMO-DURAND';

export const DEMO_VEHICLE = {
  peugeot308: 101,
  zoe: 102,
  niro: 103,
  peugeot208: 104,
} as const;

/** Derived insurance instalments use ids above this value, so they never collide with stored expenses. */
export const DERIVED_INSURANCE_ID_BASE = 1_000_000;

export const DEMO_LIMIT_MESSAGE =
  'Limite de la démo atteinte : réinitialisez-la depuis le bandeau pour continuer.';
export const DEMO_UNAVAILABLE_MESSAGE = "Cette action n'est pas disponible dans la démo.";
export const DEMO_SESSION_MISSING_MESSAGE = 'Session de démo introuvable. Rechargez la page.';
export const DEMO_PHOTOS_MESSAGE = 'Les photos ne sont pas disponibles dans la démo.';
export const DEMO_ATTACHMENTS_LABEL = 'Pièces jointes désactivées dans la démo';

/** Options of the demo cookie: session cookie, never readable from JavaScript. */
export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}
