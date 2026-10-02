import { DEMO_USER_ID } from '../../constants';
import { nextId } from '../../ops';
import { fail, isIsoDate, reply, toNumber } from '../helpers';

import type { ContractData, ContractPatch } from '../../ops';
import type { DemoApiHandler } from '../types';

const trimmedOrNull = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const insuranceHandlers: Record<string, DemoApiHandler> = {
  'POST insurance/create': ({ state, body }) => {
    const vehicleId = toNumber(body.vehicle_id);
    if (!vehicleId) return fail(400, 'Le champ vehicle_id est requis');
    const monthlyCost = toNumber(body.monthly_cost);
    if (!monthlyCost) return fail(400, 'Le coût mensuel est requis');
    if (!isIsoDate(body.start_date)) return fail(400, 'La date de début est requise');
    if (!state.vehicles.some((v) => v.id === vehicleId && v.owner_id === DEMO_USER_ID)) {
      return fail(404, "Véhicule non trouvé ou vous n'êtes pas le propriétaire");
    }
    const data: ContractData = {
      vehicle_id: vehicleId,
      monthly_cost: monthlyCost,
      start_date: body.start_date.slice(0, 10),
      end_date: isIsoDate(body.end_date) ? body.end_date.slice(0, 10) : null,
      provider: trimmedOrNull(body.provider),
    };
    const id = nextId(state.insuranceContracts);
    return reply(
      201,
      { contract: { id, owner_id: DEMO_USER_ID, ...data } },
      { t: 'insurance.create', id, d: data },
    );
  },

  'PATCH insurance/update': ({ state, body }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, "L'identifiant du contrat est requis");
    const contract = state.insuranceContracts.find((c) => c.id === id);
    if (!contract) return fail(404, "Contrat d'assurance introuvable");
    if (contract.owner_id !== DEMO_USER_ID) return fail(403, 'Non autorisé');
    const patch: ContractPatch = {};
    if (body.provider !== undefined) patch.provider = trimmedOrNull(body.provider);
    const monthlyCost = toNumber(body.monthly_cost);
    if (monthlyCost !== null) patch.monthly_cost = monthlyCost;
    if (isIsoDate(body.start_date)) patch.start_date = body.start_date.slice(0, 10);
    if (body.end_date !== undefined) {
      patch.end_date = isIsoDate(body.end_date) ? body.end_date.slice(0, 10) : null;
    }
    return reply(
      200,
      { contract: { ...contract, ...patch } },
      { t: 'insurance.update', id, d: patch },
    );
  },

  'DELETE insurance/delete': ({ state, body }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, "L'identifiant du contrat est requis");
    const contract = state.insuranceContracts.find((c) => c.id === id);
    if (!contract) return fail(404, "Contrat d'assurance introuvable");
    if (contract.owner_id !== DEMO_USER_ID) return fail(403, 'Non autorisé');
    return reply(200, { success: true }, { t: 'insurance.delete', id });
  },
};
