import { normalizeFuelType } from '@/lib/utils/vehicleEnergy';

import { DEMO_USER_ID } from '../../constants';
import { EMPTY_VEHICLE, nextId } from '../../ops';
import { fail, isIsoDate, reply, toNumber, toText, visibleVehicle } from '../helpers';

import type { VehicleData } from '../../ops';
import type { DemoApiHandler, JsonBody } from '../types';

const dateOrNull = (value: unknown) => (isIsoDate(value) ? value.slice(0, 10) : null);

/** VehicleForm payload -> vehicle columns (same transforms as vehicles/add and vehicles/update). */
function toVehicleData(body: JsonBody): VehicleData {
  const data: VehicleData = {};
  if ('name' in body) data.name = toText(body.name);
  if ('make' in body) data.make = typeof body.make === 'string' ? body.make.trim() : '';
  if ('model' in body) data.model = typeof body.model === 'string' ? body.model.trim() : '';
  if ('year' in body) data.year = toNumber(body.year);
  if ('fuel_type' in body) data.fuel_type = normalizeFuelType(body.fuel_type) ?? null;
  if ('odometer' in body) data.odometer = toNumber(body.odometer) ?? 0;
  if ('color' in body) data.color = toText(body.color);
  if ('plate' in body) data.plate = toText(body.plate)?.toUpperCase() ?? null;
  if ('vin' in body) data.vin = toText(body.vin)?.toUpperCase() ?? null;
  if ('status' in body) {
    data.status = body.status === 'sold' || body.status === 'archived' ? body.status : 'active';
  }
  if ('transmission' in body) {
    data.transmission =
      body.transmission === 'automatic' || body.transmission === 'manual'
        ? body.transmission
        : null;
  }
  if ('image' in body) data.image = toText(body.image);
  if ('tech_control_expiry' in body)
    data.tech_control_expiry = dateOrNull(body.tech_control_expiry);
  if ('financing_mode' in body) {
    data.financing_mode =
      body.financing_mode === 'owned' ||
      body.financing_mode === 'lld' ||
      body.financing_mode === 'loa'
        ? body.financing_mode
        : null;
  }
  if ('purchase_date' in body) data.purchase_date = dateOrNull(body.purchase_date);
  if ('purchase_price' in body) data.purchase_price = toNumber(body.purchase_price);
  if ('co2_emission' in body) data.co2_emission = toNumber(body.co2_emission);
  return data;
}

/** Same 400 as vehicles/add and vehicles/update for an unknown energy. */
const invalidFuelType = (body: JsonBody) =>
  'fuel_type' in body && normalizeFuelType(body.fuel_type) === undefined;

function isPermissionEntry(
  value: unknown,
): value is { userId: string; level: 'read' | 'write' | 'none' } {
  if (typeof value !== 'object' || value === null) return false;
  const { userId, level } = value as { userId?: unknown; level?: unknown };
  return typeof userId === 'string' && (level === 'read' || level === 'write' || level === 'none');
}

export const vehicleHandlers: Record<string, DemoApiHandler> = {
  'POST vehicles/add': ({ state, body, now }) => {
    if (invalidFuelType(body)) return fail(400, 'Type de carburant invalide');
    const data = toVehicleData(body);
    if (!data.make) return fail(500, 'La marque est requise');
    if (!data.model) return fail(500, 'Le modèle est requis');
    const id = nextId(state.vehicles);
    const vehicle = { ...EMPTY_VEHICLE, ...data, id, owner_id: DEMO_USER_ID, created_at: now };
    return reply(
      200,
      { message: 'Véhicule ajouté avec succès', vehicle },
      { t: 'vehicle.add', id, at: now, d: data },
    );
  },

  'PATCH vehicles/update': ({ state, body }) => {
    const id = toNumber(body.vehicle_id);
    if (!id) return fail(400, 'Le champ vehicle_id est requis');
    if (invalidFuelType(body)) return fail(400, 'Type de carburant invalide');
    const vehicle = state.vehicles.find((v) => v.id === id);
    const visible = visibleVehicle(state, id);
    if (!vehicle || !visible) return fail(404, 'Véhicule introuvable');
    if (vehicle.owner_id !== DEMO_USER_ID && visible.permission_level !== 'write') {
      return fail(403, 'Non autorisé');
    }
    const data = toVehicleData(body);
    if (Object.keys(data).length === 0) return fail(400, 'Aucune donnée à mettre à jour');
    if ('make' in data && !data.make) return fail(500, 'La marque est requise');
    if ('model' in data && !data.model) return fail(500, 'Le modèle est requis');
    return reply(
      200,
      { message: 'Véhicule mis à jour avec succès', vehicle: { ...vehicle, ...data } },
      { t: 'vehicle.update', id, d: data },
    );
  },

  'DELETE vehicles/delete': ({ state, body }) => {
    const id = toNumber(body.vehicle_id);
    if (!id) return fail(400, 'Le champ vehicle_id est requis');
    if (!state.vehicles.some((v) => v.id === id && v.owner_id === DEMO_USER_ID)) {
      return fail(404, 'Véhicule introuvable ou accès refusé');
    }
    return reply(
      200,
      { message: 'Véhicule supprimé avec succès', vehicle_id: id },
      { t: 'vehicle.delete', id },
    );
  },

  'POST vehicles/permissions': ({ state, body }) => {
    const vehicleId = toNumber(body.vehicleId);
    if (!vehicleId || !Array.isArray(body.permissions)) {
      return fail(400, 'vehicleId et permissions sont requis');
    }
    if (!body.permissions.every(isPermissionEntry)) {
      return fail(400, 'Niveau de permission invalide');
    }
    if (!state.vehicles.some((v) => v.id === vehicleId && v.owner_id === DEMO_USER_ID)) {
      return fail(403, 'Véhicule introuvable ou accès refusé');
    }
    // Like the real route: any family the visitor belongs to, not only the ones they created
    const myFamilies = state.familyMembers
      .filter((m) => m.user_id === DEMO_USER_ID)
      .map((m) => m.family_id);
    const members = new Set(
      state.familyMembers.filter((m) => myFamilies.includes(m.family_id)).map((m) => m.user_id),
    );
    const entries = body.permissions.filter(isPermissionEntry);
    if (entries.some((p) => p.level !== 'none' && !members.has(p.userId))) {
      return fail(403, 'Certains utilisateurs ne font pas partie de votre famille');
    }
    return reply(
      200,
      { success: true },
      {
        t: 'permissions.set',
        vehicleId,
        p: entries.map(({ userId, level }) => ({ userId, level })),
      },
    );
  },
};
