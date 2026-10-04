/**
 * @file lib/validation/expense.ts
 * @description Body checks shared by the expense, fill and maintenance routes (P3.6).
 * Business checks that need the vehicle (energy, odometer) stay in the routes.
 */
import {
  check,
  firstError,
  isIsoDate,
  isNonNegativeNumber,
  isOneOf,
  isOptionalText,
  optional,
} from './body';

import type { JsonBody } from './body';

export const NOTES_MAX = 1000;

export const INVALID_DATE = 'Veuillez entrer une date valide';
export const NOTES_TOO_LONG = `Les notes ne peuvent pas dépasser ${NOTES_MAX} caractères`;

/** Date (required) and notes (optional): the fields every expense form sends. */
export function expenseBaseError(body: JsonBody): string | null {
  return firstError(
    check(isIsoDate(body.date), INVALID_DATE),
    check(isOptionalText(body.notes, NOTES_MAX), NOTES_TOO_LONG),
  );
}

/** Fill / charge quantities: all optional, never negative. */
export function fillFieldsError(body: JsonBody): string | null {
  const nonNegative = optional(isNonNegativeNumber);
  return firstError(
    check(
      optional((v) => isOneOf(v, ['fill', 'charge'] as const))(body.charge_type),
      'Type de plein invalide',
    ),
    check(nonNegative(body.liters), 'Veuillez entrer un nombre de litres valide'),
    check(nonNegative(body.price_per_liter), 'Veuillez entrer un prix au litre valide'),
    check(nonNegative(body.kwh), 'Veuillez entrer un nombre de kWh valide'),
    check(nonNegative(body.price_per_kwh), 'Veuillez entrer un prix au kWh valide'),
  );
}
