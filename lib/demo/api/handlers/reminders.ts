import { DEMO_USER_ID } from '../../constants';
import { nextId } from '../../ops';
import { canWriteVehicle, fail, reply, toNumber, toText, visibleVehicle } from '../helpers';

import type { ReminderData, ReminderPatch } from '../../ops';
import type { DemoApiHandler, JsonBody } from '../types';
import type { ReminderType } from '@/types/reminder';

const REMINDER_TYPES: readonly ReminderType[] = [
  'maintenance',
  'insurance',
  'inspection',
  'custom',
];

const isReminderType = (value: unknown): value is ReminderType =>
  typeof value === 'string' && (REMINDER_TYPES as readonly string[]).includes(value);

/** Whitelisted ReminderFormData fields (the real route writes the body verbatim). */
function toReminderPatch(body: JsonBody): ReminderPatch {
  const patch: ReminderPatch = {};
  if (body.vehicle_id !== undefined) patch.vehicle_id = toNumber(body.vehicle_id);
  if (isReminderType(body.type)) patch.type = body.type;
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = toText(body.description)?.trim() ?? null;
  if (body.due_date !== undefined) patch.due_date = toText(body.due_date);
  if (body.due_odometer !== undefined) patch.due_odometer = toNumber(body.due_odometer);
  if (body.is_recurring !== undefined) patch.is_recurring = body.is_recurring === true;
  if (body.recurrence_type !== undefined) {
    patch.recurrence_type =
      body.recurrence_type === 'km' || body.recurrence_type === 'time'
        ? body.recurrence_type
        : null;
  }
  if (body.recurrence_value !== undefined) patch.recurrence_value = toNumber(body.recurrence_value);
  return patch;
}

export const reminderHandlers: Record<string, DemoApiHandler> = {
  'POST reminders/create': ({ state, body, now }) => {
    if (typeof body.title !== 'string' || !body.title.trim())
      return fail(400, 'Le titre est requis');
    if (!isReminderType(body.type)) return fail(400, 'Le type est requis');
    const vehicleId = toNumber(body.vehicle_id);
    if (vehicleId !== null && !canWriteVehicle(visibleVehicle(state, vehicleId))) {
      return fail(403, "Vous n'avez pas les droits pour ajouter un rappel à ce véhicule");
    }
    const patch = toReminderPatch(body);
    const data: ReminderData = {
      vehicle_id: vehicleId,
      type: body.type,
      title: body.title.trim(),
      description: patch.description ?? null,
      due_date: patch.due_date ?? null,
      due_odometer: patch.due_odometer ?? null,
      is_recurring: patch.is_recurring ?? false,
      recurrence_type: patch.recurrence_type ?? null,
      recurrence_value: patch.recurrence_value ?? null,
      maintenance_type_id: toText(body.maintenance_type_id),
    };
    const id = nextId(state.reminders);
    return reply(
      201,
      {
        reminder: {
          id,
          user_id: DEMO_USER_ID,
          ...data,
          last_triggered_at: null,
          is_completed: false,
          estimated_due_date: null,
          created_at: now,
        },
      },
      { t: 'reminder.create', id, at: now, d: data },
    );
  },

  'PATCH reminders/update': ({ state, body }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, "L'identifiant est requis");
    const reminder = state.reminders.find((r) => r.id === id);
    if (!reminder) return fail(404, 'Rappel non trouvé');
    if (reminder.user_id !== DEMO_USER_ID) return fail(403, 'Non autorisé');
    const patch = toReminderPatch(body);
    return reply(
      200,
      { reminder: { ...reminder, ...patch } },
      { t: 'reminder.update', id, d: patch },
    );
  },

  'DELETE reminders/delete': ({ state, body }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, "L'identifiant est requis");
    // Like the real route: success even when no own reminder matches
    const owned = state.reminders.some((r) => r.id === id && r.user_id === DEMO_USER_ID);
    return reply(200, { success: true }, owned ? { t: 'reminder.delete', id } : undefined);
  },

  'PATCH reminders/complete': ({ state, body, now }) => {
    const id = toNumber(body.id);
    if (!id) return fail(400, "L'identifiant est requis");
    const reminder = state.reminders.find((r) => r.id === id && r.user_id === DEMO_USER_ID);
    if (!reminder) return fail(404, 'Rappel introuvable');
    const done = Boolean(body.is_completed ?? true);
    return reply(
      200,
      { reminder: { ...reminder, is_completed: done, last_triggered_at: done ? now : null } },
      { t: 'reminder.complete', id, at: now, done },
    );
  },
};
