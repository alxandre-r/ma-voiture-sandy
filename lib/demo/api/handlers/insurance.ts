import {
  findOverlap,
  formatOverlapError,
  planContractChange,
  validateContractInput,
} from '@/lib/utils/insuranceUtils';

import { DEMO_USER_ID } from '../../constants';
import { nextId } from '../../ops';
import { fail, isIsoDate, reply, toNumber } from '../helpers';

import type { ContractData, ContractPatch } from '../../ops';
import type { DemoState } from '../../types';
import type { DemoApiHandler } from '../types';

const trimmedOrNull = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const ownsVehicle = (state: DemoState, vehicleId: number) =>
  state.vehicles.some((v) => v.id === vehicleId && v.owner_id === DEMO_USER_ID);

const siblingsOf = (state: DemoState, vehicleId: number) =>
  state.insuranceContracts.filter((c) => c.vehicle_id === vehicleId);

const NOT_OWNER = "Véhicule non trouvé ou vous n'êtes pas le propriétaire";

// Mirrors app/api/insurance/* (same rules from lib/utils/insuranceUtils, same messages)
export const insuranceHandlers: Record<string, DemoApiHandler> = {
  'POST insurance/create': ({ state, body }) => {
    const vehicleId = toNumber(body.vehicle_id);
    if (!vehicleId) return fail(400, 'Le champ vehicle_id est requis');
    const invalid = validateContractInput({
      monthly_cost: body.monthly_cost,
      start_date: body.start_date,
      end_date: body.end_date,
    });
    if (invalid) return fail(400, invalid);
    if (!ownsVehicle(state, vehicleId)) return fail(404, NOT_OWNER);
    const data: ContractData = {
      vehicle_id: vehicleId,
      monthly_cost: Number(body.monthly_cost),
      start_date: String(body.start_date).slice(0, 10),
      end_date: isIsoDate(body.end_date) ? body.end_date.slice(0, 10) : null,
      provider: trimmedOrNull(body.provider),
    };
    const overlap = findOverlap(siblingsOf(state, vehicleId), data);
    if (overlap) return fail(409, formatOverlapError(overlap));
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
    if (body.monthly_cost !== undefined) patch.monthly_cost = Number(body.monthly_cost);
    if (body.start_date !== undefined) patch.start_date = String(body.start_date).slice(0, 10);
    if (body.end_date !== undefined) {
      patch.end_date = isIsoDate(body.end_date) ? body.end_date.slice(0, 10) : null;
    }
    const merged = { ...contract, ...patch };
    const invalid = validateContractInput(merged);
    if (invalid) return fail(400, invalid);
    const overlap = findOverlap(siblingsOf(state, contract.vehicle_id), merged, id);
    if (overlap) return fail(409, formatOverlapError(overlap));
    return reply(200, { contract: merged }, { t: 'insurance.update', id, d: patch });
  },

  'POST insurance/change': ({ state, body }) => {
    const vehicleId = toNumber(body.vehicle_id);
    if (!vehicleId) return fail(400, 'Le champ vehicle_id est requis');
    if (!ownsVehicle(state, vehicleId)) return fail(404, NOT_OWNER);
    const plan = planContractChange(siblingsOf(state, vehicleId), {
      vehicle_id: vehicleId,
      monthly_cost: body.monthly_cost,
      effective_date: body.effective_date,
      provider: body.provider,
    });
    if (!plan.ok) return fail(plan.status, plan.error);
    const id = nextId(state.insuranceContracts);
    return reply(
      201,
      { contract: { id, owner_id: DEMO_USER_ID, ...plan.create } },
      { t: 'insurance.change', id, d: plan.create, close: plan.close },
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
