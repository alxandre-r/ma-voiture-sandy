/**
 * @file lib/validation/vehicle.ts
 * @description Vehicle field checks shared by vehicles/add and vehicles/update (P3.6).
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

const STATUSES = ['active', 'sold', 'archived'] as const;
const TRANSMISSIONS = ['manual', 'automatic'] as const;
const FINANCING_MODES = ['owned', 'lld', 'loa'] as const;

const isYear = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
};

/** Field checks shared by add and update (absent or blank fields pass). Lengths follow the DB columns. */
export function vehicleFieldsError(fields: Record<string, unknown>): string | null {
  return firstError(
    check(isOptionalText(fields.name, 100), 'Le nom ne doit pas dépasser 100 caractères'),
    check(isOptionalText(fields.make, 100), 'La marque ne doit pas dépasser 100 caractères'),
    check(isOptionalText(fields.model, 100), 'Le modèle ne doit pas dépasser 100 caractères'),
    check(optional(isYear)(fields.year), 'Année invalide'),
    check(optional(isNonNegativeNumber)(fields.odometer), 'Kilométrage invalide'),
    check(isOptionalText(fields.plate, 20), "L'immatriculation ne doit pas dépasser 20 caractères"),
    check(isOptionalText(fields.vin, 17), 'Le VIN ne doit pas dépasser 17 caractères'),
    check(isOptionalText(fields.color, 7), 'Couleur invalide'),
    check(optional((v) => isOneOf(v, STATUSES))(fields.status), 'Statut invalide'),
    check(
      optional((v) => isOneOf(v, TRANSMISSIONS))(fields.transmission),
      'Boîte de vitesses invalide',
    ),
    check(isOptionalText(fields.image, 2048), 'Image invalide'),
    check(optional(isIsoDate)(fields.tech_control_expiry), 'Date de contrôle technique invalide'),
    check(
      optional((v) => isOneOf(v, FINANCING_MODES))(fields.financing_mode),
      'Mode de financement invalide',
    ),
    check(optional(isIsoDate)(fields.purchase_date), "Date d'achat invalide"),
    check(optional(isNonNegativeNumber)(fields.purchase_price), "Prix d'achat invalide"),
    check(optional(isNonNegativeNumber)(fields.co2_emission), 'Émissions de CO2 invalides'),
  );
}
