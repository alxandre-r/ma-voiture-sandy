import { DEMO_USER_ID } from '../../constants';
import { nextId } from '../../ops';
import { expensesForDisplay, isDerivedInsuranceId } from '../../views';
import {
  canEditExpense,
  canWriteVehicle,
  fail,
  isIsoDate,
  reply,
  toNumber,
  toText,
  visibleVehicle,
} from '../helpers';

import type { ExpensePatch, FillData, MaintenanceData, OtherData } from '../../ops';
import type { DemoState } from '../../types';
import type { DemoApiHandler, DemoApiResult, JsonBody } from '../types';

/** Same 0/null rules as fills/add, except liters stay null for a charge (see spec §12). */
function toFillData(vehicleId: number, date: string, body: JsonBody): FillData {
  const isCharge = body.charge_type === 'charge';
  return {
    vehicle_id: vehicleId,
    date,
    amount: toNumber(body.amount) ?? 0,
    notes: toText(body.notes),
    odometer: toNumber(body.odometer),
    charge_type: isCharge ? 'charge' : 'fill',
    liters: isCharge ? null : toNumber(body.liters),
    price_per_liter: isCharge ? null : toNumber(body.price_per_liter),
    kwh: isCharge ? toNumber(body.kwh) : null,
    price_per_kwh: isCharge ? toNumber(body.price_per_kwh) : null,
  };
}

function fillResponse(id: number, data: FillData, extra: Record<string, unknown>) {
  return {
    id,
    expense_id: id,
    odometer: data.odometer,
    liters: data.liters,
    price_per_liter: data.price_per_liter,
    charge_type: data.charge_type,
    kwh: data.kwh,
    price_per_kwh: data.price_per_kwh,
    ...extra,
  };
}

function missingField(body: JsonBody, fields: readonly string[]): DemoApiResult | null {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      return fail(400, `Le champ ${field} est requis`);
    }
  }
  return null;
}

function denyIfNotWritable(state: DemoState, vehicleId: number): DemoApiResult | null {
  const vehicle = visibleVehicle(state, vehicleId);
  if (!vehicle) return fail(404, 'Véhicule introuvable');
  if (!canWriteVehicle(vehicle)) {
    return fail(403, "Vous n'avez pas les droits pour ajouter une dépense à ce véhicule");
  }
  return null;
}

function toExpensePatch(body: JsonBody): ExpensePatch {
  const patch: ExpensePatch = {};
  const vehicleId = toNumber(body.vehicle_id);
  if (vehicleId) patch.vehicle_id = vehicleId;
  if (isIsoDate(body.date)) patch.date = body.date.slice(0, 10);
  if (body.amount !== undefined) patch.amount = toNumber(body.amount) ?? 0;
  if (body.notes !== undefined) patch.notes = toText(body.notes);
  if (typeof body.type === 'string') patch.type = body.type;
  if (body.maintenance_type !== undefined) patch.maintenance_type = toText(body.maintenance_type);
  if (body.garage !== undefined) patch.garage = toText(body.garage);
  if (body.label !== undefined) patch.label = toText(body.label);
  if (body.odometer !== undefined) patch.odometer = toNumber(body.odometer);
  if (body.liters !== undefined) patch.liters = toNumber(body.liters);
  if (body.price_per_liter !== undefined) patch.price_per_liter = toNumber(body.price_per_liter);
  if (body.kwh !== undefined) patch.kwh = toNumber(body.kwh);
  if (body.price_per_kwh !== undefined) patch.price_per_kwh = toNumber(body.price_per_kwh);
  return patch;
}

export const expenseHandlers: Record<string, DemoApiHandler> = {
  'POST fills/add': ({ state, body, now }) => {
    const vehicleId = toNumber(body.vehicle_id);
    if (!vehicleId) return fail(400, 'Le champ vehicle_id est requis');
    const denied = denyIfNotWritable(state, vehicleId);
    if (denied) return denied;
    if (!isIsoDate(body.date)) return fail(500, 'Erreur lors de la création de la dépense');
    const vehicle = visibleVehicle(state, vehicleId);
    const data = toFillData(vehicleId, body.date.slice(0, 10), body);
    const id = nextId(state.expenses);
    return reply(
      201,
      {
        fill: fillResponse(id, data, {
          created_at: now,
          vehicle_id: vehicleId,
          vehicle_name: vehicle?.name ?? null,
          fuel_type: vehicle?.fuel_type ?? null,
          date: data.date,
          amount: body.amount ?? null,
          notes: body.notes ?? null,
        }),
        message:
          data.charge_type === 'charge'
            ? 'Recharge ajoutée avec succès'
            : 'Plein ajouté avec succès',
      },
      { t: 'fill.add', id, at: now, d: data },
    );
  },

  'PATCH fills/update': ({ state, body }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, 'Le champ id est requis');
    // The dashboard sends the expense id: in the demo a fill is identified by its expense
    const expense = state.expenses.find((e) => e.id === id && e.fill);
    if (!expense) return fail(404, 'Plein non trouvé');
    if (!canEditExpense(state, expense)) {
      return fail(403, "Vous n'êtes pas autorisé à modifier ce plein");
    }
    const date = isIsoDate(body.date) ? body.date.slice(0, 10) : expense.date;
    const data = toFillData(expense.vehicle_id, date, body);
    const vehicle = visibleVehicle(state, expense.vehicle_id);
    return reply(
      200,
      {
        fill: fillResponse(id, data, {
          created_at: expense.created_at,
          vehicle_name: vehicle?.name ?? null,
          fuel_type: vehicle?.fuel_type ?? null,
        }),
        message: 'Plein mis à jour avec succès',
      },
      { t: 'fill.update', id, d: data },
    );
  },

  'POST expenses/other/add': ({ state, body, now }) => {
    const missing = missingField(body, ['vehicle_id', 'date', 'amount', 'label']);
    if (missing) return missing;
    const vehicleId = toNumber(body.vehicle_id) ?? 0;
    const denied = denyIfNotWritable(state, vehicleId);
    if (denied) return denied;
    const data: OtherData = {
      vehicle_id: vehicleId,
      date: String(body.date).slice(0, 10),
      amount: toNumber(body.amount) ?? 0,
      label: String(body.label),
      notes: toText(body.notes),
    };
    const id = nextId(state.expenses);
    return reply(
      201,
      {
        expense: {
          id,
          vehicle_id: vehicleId,
          owner_id: DEMO_USER_ID,
          type: 'other',
          amount: data.amount,
          date: data.date,
          notes: data.notes,
          created_at: now,
          insurance_contract_id: null,
          updated_at: now,
          label: data.label,
          vehicle_name: visibleVehicle(state, vehicleId)?.name ?? null,
        },
        message: 'Dépense ajoutée avec succès',
      },
      { t: 'other.add', id, at: now, d: data },
    );
  },

  'PATCH expenses/update': ({ state, body, now }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, 'Le champ id est requis');
    if (isDerivedInsuranceId(id)) {
      return fail(403, "Les dépenses d'assurance ne peuvent pas être modifiées");
    }
    const expense = state.expenses.find((e) => e.id === id);
    if (!expense) return fail(404, 'Dépense non trouvée');
    const patch = toExpensePatch(body);
    const movesToForbiddenVehicle =
      patch.vehicle_id !== undefined &&
      patch.vehicle_id !== expense.vehicle_id &&
      !canWriteVehicle(visibleVehicle(state, patch.vehicle_id));
    if (!canEditExpense(state, expense) || movesToForbiddenVehicle) {
      return fail(403, "Vous n'êtes pas autorisé à modifier cette dépense");
    }
    return reply(
      200,
      {
        expense: {
          id,
          vehicle_id: patch.vehicle_id ?? expense.vehicle_id,
          owner_id: expense.owner_id,
          type: expense.type,
          amount: patch.amount ?? expense.amount,
          date: patch.date ?? expense.date,
          notes: patch.notes !== undefined ? patch.notes : expense.notes,
          created_at: expense.created_at,
          insurance_contract_id: null,
          updated_at: now,
        },
        message: 'Dépense mise à jour avec succès',
      },
      { t: 'expense.update', id, at: now, d: patch },
    );
  },

  'DELETE expenses/delete': ({ state, body }) => {
    const id = toNumber(body.expenseId);
    if (!id) return fail(400, 'Le champ expenseId est requis');
    if (isDerivedInsuranceId(id)) {
      const instalment = expensesForDisplay(state).find((e) => e.id === id);
      if (!instalment) return fail(404, 'Dépense non trouvée');
      if (!canEditExpense(state, instalment)) {
        return fail(403, "Vous n'êtes pas autorisé à supprimer cette dépense");
      }
      return fail(403, "Les dépenses d'assurance ne peuvent pas être supprimées");
    }
    const expense = state.expenses.find((e) => e.id === id);
    if (!expense) return fail(404, 'Dépense non trouvée');
    if (!canEditExpense(state, expense)) {
      return fail(403, "Vous n'êtes pas autorisé à supprimer cette dépense");
    }
    return reply(
      200,
      { message: 'Dépense supprimée avec succès', expenseId: id },
      { t: 'expense.delete', id },
    );
  },

  'POST maintenance/add': ({ state, body, now }) => {
    const missing = missingField(body, ['vehicle_id', 'date', 'amount']);
    if (missing) return missing;
    const vehicleId = toNumber(body.vehicle_id) ?? 0;
    const denied = denyIfNotWritable(state, vehicleId);
    if (denied) return denied;
    const data: MaintenanceData = {
      vehicle_id: vehicleId,
      date: String(body.date).slice(0, 10),
      amount: toNumber(body.amount) ?? 0,
      notes: toText(body.notes),
      maintenance_type: toText(body.maintenance_type) ?? 'other',
      odometer: toNumber(body.odometer),
      garage: toText(body.garage),
    };
    const id = nextId(state.expenses);
    return reply(
      201,
      {
        expense: {
          id,
          vehicle_id: vehicleId,
          owner_id: DEMO_USER_ID,
          type: 'maintenance',
          amount: data.amount,
          date: data.date,
          notes: data.notes,
          created_at: now,
          insurance_contract_id: null,
          updated_at: now,
          maintenance_type: data.maintenance_type,
          odometer: data.odometer,
          garage: data.garage,
          vehicle_name: visibleVehicle(state, vehicleId)?.name ?? null,
        },
        message: 'Entretien ajouté avec succès',
      },
      { t: 'maintenance.add', id, at: now, d: data },
    );
  },

  'DELETE maintenance/delete': ({ state, body }) => {
    const id = toNumber(body.expenseId);
    if (!id) return fail(400, 'Le champ expenseId est requis');
    const expense = state.expenses.find((e) => e.id === id && e.type === 'maintenance');
    if (!expense) return fail(404, 'Entretien non trouvé');
    if (!canEditExpense(state, expense)) {
      return fail(403, "Vous n'êtes pas autorisé à supprimer cet entretien");
    }
    return reply(200, { message: 'Entretien supprimé avec succès' }, { t: 'expense.delete', id });
  },
};
