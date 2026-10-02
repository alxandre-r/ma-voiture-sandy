import { DEMO_USER_ID } from '../../constants';
import { fail, reply, unavailable } from '../helpers';

import type { PreferencesPatch } from '../../ops';
import type { DemoApiHandler } from '../types';

const PREF_BOOLEANS = [
  'show_consumption',
  'show_insurance',
  'show_vehicle_details',
  'show_financials',
] as const;
const PERIODS = ['month', 'year', 'all'] as const;
const SCOPES = ['personal', 'family', 'all'] as const;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

export const accountHandlers: Record<string, DemoApiHandler> = {
  'PATCH family/update': ({ state, body }) => {
    const familyId = typeof body.familyId === 'string' ? body.familyId : '';
    if (!familyId) return fail(400, "L'ID de la famille est requis");
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return fail(400, 'Le nom de la famille est requis');
    if (name.length > 100) {
      return fail(400, 'Le nom de la famille ne doit pas dépasser 100 caractères');
    }
    const membership = state.familyMembers.find(
      (m) => m.family_id === familyId && m.user_id === DEMO_USER_ID,
    );
    if (!membership) {
      return fail(403, "Vous ne faites pas partie de cette famille ou elle n'existe pas");
    }
    if (membership.role !== 'owner') {
      return fail(403, 'Seul le propriétaire peut modifier les informations de la famille');
    }
    const family = state.families.find((f) => f.id === familyId);
    return reply(
      200,
      { success: true, message: 'Famille mise à jour avec succès', family: { ...family, name } },
      { t: 'family.rename', id: familyId, name },
    );
  },

  'PATCH users/preferences': ({ body, now }) => {
    const patch: PreferencesPatch = {};
    for (const key of PREF_BOOLEANS) {
      if (!(key in body)) continue;
      if (typeof body[key] !== 'boolean') return fail(400, `Valeur ${key} invalide`);
      patch[key] = body[key] as boolean;
    }
    if ('default_period' in body) {
      if (!isOneOf(PERIODS, body.default_period))
        return fail(400, 'Valeur default_period invalide');
      patch.default_period = body.default_period;
    }
    if ('default_vehicle_scope' in body) {
      if (!isOneOf(SCOPES, body.default_vehicle_scope)) {
        return fail(400, 'Valeur default_vehicle_scope invalide');
      }
      patch.default_vehicle_scope = body.default_vehicle_scope;
    }
    if (Object.keys(patch).length === 0) return fail(400, 'Aucune donnée à mettre à jour');
    return reply(
      200,
      { success: true, updated_at: now },
      { t: 'preferences.update', at: now, d: patch },
    );
  },

  'POST users/update-profile': ({ state, body }) => {
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    if (!name && !email) return fail(400, 'Aucune donnée à mettre à jour');
    if (body.name !== undefined && !name) return fail(400, 'Nom invalide');
    if (email !== undefined && !(email.includes('@') && email.includes('.') && email.length > 5)) {
      return fail(400, 'Adresse email invalide');
    }
    const user = state.users.find((u) => u.id === DEMO_USER_ID);
    if (!user) return fail(404, 'Utilisateur introuvable');
    if (email && email !== user.email) return unavailable("Le changement d'adresse email");
    if (!name || name === user.name) {
      return reply(200, { success: true, message: 'Aucune modification détectée' });
    }
    return reply(
      200,
      { success: true, message: 'Profil mis à jour avec succès' },
      { t: 'profile.update', name },
    );
  },

  'POST users/change-password': () => unavailable('Le changement de mot de passe'),
  'POST auth/delete-account': () => unavailable('La suppression du compte'),
  'POST attachments/add': () => unavailable("L'ajout de pièces jointes"),
  'DELETE attachments/delete': () => unavailable('La suppression de pièces jointes'),
  'POST family/create': () => unavailable("La création d'une famille"),
  'POST family/join': () => unavailable("L'adhésion à une famille"),
  'POST family/leave': () => unavailable('Quitter une famille'),
  'DELETE family/delete': () => unavailable('La suppression de la famille'),
};
