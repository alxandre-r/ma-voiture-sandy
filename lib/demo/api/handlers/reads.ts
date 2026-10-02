import { DEMO_USER_ID } from '../../constants';
import { expensesForDisplay, vehiclesForDisplay } from '../../views';
import { byDateDesc, fail, parseIdList, reply } from '../helpers';

import type { DemoState } from '../../types';
import type { DemoApiHandler } from '../types';

/** Requested ids restricted to visible vehicles; without ids, the viewer's own expenses. */
function scopedExpenses(state: DemoState, rawIds: string | null) {
  const requested = parseIdList(rawIds);
  const visible = new Set(vehiclesForDisplay(state, DEMO_USER_ID).map((v) => v.vehicle_id));
  return expensesForDisplay(state)
    .filter((e) =>
      requested.length > 0
        ? requested.includes(e.vehicle_id) && visible.has(e.vehicle_id)
        : e.owner_id === DEMO_USER_ID,
    )
    .sort(byDateDesc);
}

export const readHandlers: Record<string, DemoApiHandler> = {
  'GET expenses/get': ({ state, query }) =>
    reply(200, { expenses: scopedExpenses(state, query.get('vehicleIds')) }),

  'GET expenses/maintenanceExpense': ({ state, query }) =>
    reply(200, {
      expenses: scopedExpenses(state, query.get('vehicleIds')).filter(
        (e) => e.type === 'maintenance',
      ),
    }),

  'GET search': ({ state, query }) => {
    const q = (query.get('q') ?? '').trim();
    if (q.length < 2) return reply(200, { expenses: [], reminders: [] });
    const needle = q.toLowerCase();
    const matches = (value: string | null | undefined) =>
      !!value && value.toLowerCase().includes(needle);
    const owned = new Set(
      state.vehicles.filter((v) => v.owner_id === DEMO_USER_ID).map((v) => v.id),
    );
    const expenses = expensesForDisplay(state)
      .filter(
        (e) =>
          owned.has(e.vehicle_id) &&
          (matches(e.notes) ||
            matches(e.label) ||
            matches(e.vehicle_name) ||
            matches(e.maintenance_type_label)),
      )
      .sort(byDateDesc)
      .slice(0, 8)
      .map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        date: e.date,
        notes: e.notes,
        label: e.label,
        vehicle_name: e.vehicle_name,
        maintenance_type_label: e.maintenance_type_label,
      }));
    const reminders = state.reminders
      .filter((r) => r.user_id === DEMO_USER_ID && !r.is_completed && matches(r.title))
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
      .slice(0, 5)
      .map((r) => ({ id: r.id, title: r.title, due_date: r.due_date, vehicle_id: r.vehicle_id }));
    return reply(200, { expenses, reminders });
  },

  'GET vehicles/permissions': ({ state, query }) => {
    const raw = query.get('vehicleId');
    if (!raw) return fail(400, 'vehicleId est requis');
    const vehicle = state.vehicles.find((v) => v.id === Number(raw) && v.owner_id === DEMO_USER_ID);
    if (!vehicle) return fail(403, 'Véhicule introuvable ou accès refusé');
    const data = state.permissions
      .filter((p) => p.vehicle_id === vehicle.id)
      .map((p) => ({ user_id: p.user_id, permission_level: p.permission_level }));
    return reply(200, { data });
  },

  'GET family/getByInvitToken': ({ query }) =>
    query.get('token')
      ? fail(404, "Dans la démo, il n'y a pas d'autre famille à rejoindre.")
      : fail(400, "Token d'invitation requis"),
};
