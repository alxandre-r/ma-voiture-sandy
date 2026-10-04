/**
 * @file lib/demo/ops.ts
 * @description Journal operations (what a visitor changed), replayed on top of the seed.
 * Reducers also reproduce the DB triggers: odometer update, maintenance reminder, recurrence.
 */

import { DEMO_USER_ID } from './constants';
import { addMonths, toTimestamp } from './dates';

import type { DemoExpense, DemoState, DemoVehicle } from './types';
import type { RecurrenceType, Reminder, ReminderType } from '@/types/reminder';
import type { UserPreferences } from '@/types/userPreferences';

export interface FillData {
  vehicle_id: number;
  date: string;
  amount: number;
  notes: string | null;
  odometer: number | null;
  charge_type: 'fill' | 'charge';
  liters: number | null;
  price_per_liter: number | null;
  kwh: number | null;
  price_per_kwh: number | null;
}

export interface OtherData {
  vehicle_id: number;
  date: string;
  amount: number;
  label: string;
  notes: string | null;
}

export interface MaintenanceData {
  vehicle_id: number;
  date: string;
  amount: number;
  notes: string | null;
  maintenance_type: string;
  odometer: number | null;
  garage: string | null;
}

export interface ExpensePatch {
  vehicle_id?: number;
  date?: string;
  amount?: number;
  notes?: string | null;
  type?: string;
  maintenance_type?: string | null;
  odometer?: number | null;
  garage?: string | null;
  label?: string | null;
  liters?: number | null;
  price_per_liter?: number | null;
  kwh?: number | null;
  price_per_kwh?: number | null;
}

export interface ReminderData {
  vehicle_id: number | null;
  type: ReminderType;
  title: string;
  description: string | null;
  due_date: string | null;
  due_odometer: number | null;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_value: number | null;
  maintenance_type_id: string | null;
}

export type ReminderPatch = Partial<Omit<ReminderData, 'maintenance_type_id'>>;

export interface ContractData {
  vehicle_id: number;
  monthly_cost: number;
  start_date: string;
  end_date: string | null;
  provider: string | null;
}

export type ContractPatch = Partial<Omit<ContractData, 'vehicle_id'>>;

export type VehicleData = Partial<Omit<DemoVehicle, 'id' | 'owner_id' | 'created_at'>>;

export type PreferencesPatch = Partial<
  Pick<
    UserPreferences,
    | 'show_consumption'
    | 'show_insurance'
    | 'show_vehicle_details'
    | 'show_financials'
    | 'default_period'
    | 'default_vehicle_scope'
  >
>;

export type DemoOp =
  | { t: 'fill.add'; id: number; at: string; d: FillData }
  | { t: 'fill.update'; id: number; d: FillData }
  | { t: 'other.add'; id: number; at: string; d: OtherData }
  | { t: 'expense.update'; id: number; at: string; d: ExpensePatch }
  | { t: 'expense.delete'; id: number }
  | { t: 'maintenance.add'; id: number; at: string; d: MaintenanceData }
  | { t: 'reminder.create'; id: number; at: string; d: ReminderData }
  | { t: 'reminder.update'; id: number; d: ReminderPatch }
  | { t: 'reminder.delete'; id: number }
  | { t: 'reminder.complete'; id: number; at: string; done: boolean }
  | { t: 'insurance.create'; id: number; d: ContractData }
  | { t: 'insurance.update'; id: number; d: ContractPatch }
  | { t: 'insurance.delete'; id: number }
  | {
      t: 'insurance.change';
      id: number;
      d: ContractData;
      close: { id: number; end_date: string } | null;
    }
  | { t: 'vehicle.add'; id: number; at: string; d: VehicleData }
  | { t: 'vehicle.update'; id: number; d: VehicleData }
  | { t: 'vehicle.delete'; id: number }
  | {
      t: 'permissions.set';
      vehicleId: number;
      p: { userId: string; level: 'read' | 'write' | 'none' }[];
    }
  | { t: 'family.rename'; id: string; name: string }
  | { t: 'preferences.update'; at: string; d: PreferencesPatch }
  | { t: 'profile.update'; name: string };

const OP_TYPES: ReadonlySet<string> = new Set<DemoOp['t']>([
  'fill.add',
  'fill.update',
  'other.add',
  'expense.update',
  'expense.delete',
  'maintenance.add',
  'reminder.create',
  'reminder.update',
  'reminder.delete',
  'reminder.complete',
  'insurance.create',
  'insurance.update',
  'insurance.change',
  'insurance.delete',
  'vehicle.add',
  'vehicle.update',
  'vehicle.delete',
  'permissions.set',
  'family.rename',
  'preferences.update',
  'profile.update',
]);

/** Op types carrying a `d` payload. */
const PAYLOAD_OP_TYPES: ReadonlySet<string> = new Set<DemoOp['t']>([
  'fill.add',
  'fill.update',
  'other.add',
  'expense.update',
  'maintenance.add',
  'reminder.create',
  'reminder.update',
  'insurance.create',
  'insurance.update',
  'insurance.change',
  'vehicle.add',
  'vehicle.update',
  'preferences.update',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isDemoOp(value: unknown): value is DemoOp {
  if (typeof value !== 'object' || value === null) return false;
  const { t: type, d } = value as { t?: unknown; d?: unknown };
  if (typeof type !== 'string' || !OP_TYPES.has(type)) return false;
  if (type === 'insurance.change') {
    const { close } = value as { close?: unknown };
    if (close !== null) {
      if (!isPlainObject(close)) return false;
      if (typeof close.id !== 'number' || typeof close.end_date !== 'string') return false;
    }
  }
  return !PAYLOAD_OP_TYPES.has(type) || isPlainObject(d);
}

/** Keys a payload must never carry: identity/ownership and prototype keys (the cookie can be tampered with). */
const FORBIDDEN_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  'id',
  'owner_id',
  'user_id',
  '__proto__',
  'constructor',
  'prototype',
]);

/** Copy of a payload without forbidden keys, safe to spread or Object.assign onto an entity. */
function sanitize<T extends object>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !FORBIDDEN_PAYLOAD_KEYS.has(key)),
  ) as T;
}

export function nextId(items: ReadonlyArray<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export const EMPTY_VEHICLE: Omit<DemoVehicle, 'id' | 'owner_id' | 'created_at'> = {
  name: null,
  make: '',
  model: '',
  year: null,
  fuel_type: null,
  odometer: 0,
  plate: null,
  color: null,
  status: 'active',
  vin: null,
  transmission: null,
  image: null,
  tech_control_expiry: null,
  financing_mode: null,
  purchase_date: null,
  purchase_price: null,
  co2_emission: null,
};

/** Same rule as raiseVehicleOdometer: the vehicle odometer only goes up. */
function setVehicleOdometer(state: DemoState, vehicleId: number, odometer: number): void {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (vehicle && odometer > vehicle.odometer) vehicle.odometer = odometer;
}

/** Port of update_maintenance_reminder + compute_next_due (functions.sql). */
export function upsertMaintenanceReminder(
  state: DemoState,
  vehicleId: number,
  typeId: string,
  at: string,
): void {
  const type = state.maintenanceTypes[typeId];
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!type || !vehicle) return;

  const last = state.expenses
    .filter((e) => e.vehicle_id === vehicleId && e.maintenance?.maintenance_type_id === typeId)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.maintenance?.odometer ?? 0) - (a.maintenance?.odometer ?? 0),
    )[0];
  if (!last) return;

  let dueOdometer: number | null = null;
  let dueDate: string | null = null;
  let recurrenceType: RecurrenceType | null = null;
  let recurrenceValue: number | null = null;
  const lastOdometer = last.maintenance?.odometer ?? null;

  if (type.interval_km !== null && lastOdometer !== null) {
    dueOdometer = lastOdometer + type.interval_km;
    recurrenceType = 'km';
    recurrenceValue = type.interval_km;
  }
  if (type.interval_months !== null) {
    dueDate = toTimestamp(addMonths(last.date, type.interval_months));
    if (recurrenceType === null) {
      recurrenceType = 'time';
      recurrenceValue = type.interval_months;
    }
  }
  if (dueDate === null && dueOdometer === null) return;

  const fields = {
    title: type.label_fr,
    type: 'maintenance' as const,
    due_date: dueDate,
    due_odometer: dueOdometer,
    recurrence_type: recurrenceType,
    recurrence_value: recurrenceValue,
    is_recurring: recurrenceType !== null,
  };
  const existing = state.reminders.find(
    (r) => r.vehicle_id === vehicleId && r.maintenance_type_id === typeId,
  );
  if (existing) {
    Object.assign(existing, fields, { last_triggered_at: at, source_expense_id: last.id });
    return;
  }
  state.reminders.push({
    id: nextId(state.reminders),
    user_id: vehicle.owner_id,
    vehicle_id: vehicleId,
    description: null,
    last_triggered_at: null,
    is_completed: false,
    maintenance_type_id: typeId,
    estimated_due_date: null,
    created_at: at,
    source_expense_id: last.id,
    ...fields,
  });
}

/** reminders/complete: toggles completion and inserts the next occurrence of a recurring reminder. */
function completeReminder(state: DemoState, op: Extract<DemoOp, { t: 'reminder.complete' }>): void {
  const reminder = state.reminders.find((r) => r.id === op.id);
  if (!reminder) return;
  reminder.is_completed = op.done;
  reminder.last_triggered_at = op.done ? op.at : null;
  if (
    !op.done ||
    !reminder.is_recurring ||
    !reminder.recurrence_type ||
    !reminder.recurrence_value
  ) {
    return;
  }
  const next: Reminder = {
    ...reminder,
    id: nextId(state.reminders),
    is_completed: false,
    last_triggered_at: null,
    estimated_due_date: null,
    created_at: op.at,
  };
  // Like the real route's fresh insert: only the relevant due field is carried over
  if (reminder.recurrence_type === 'time') {
    next.due_odometer = null;
    const from = (reminder.due_date ?? op.at).slice(0, 10);
    next.due_date = toTimestamp(addMonths(from, reminder.recurrence_value));
  } else {
    next.due_date = null;
    const odometer = state.vehicles.find((v) => v.id === reminder.vehicle_id)?.odometer;
    next.due_odometer = (odometer ?? reminder.due_odometer ?? 0) + reminder.recurrence_value;
  }
  state.reminders.push(next);
}

/** expenses/update: base fields + type-specific details (+ maintenance reminder recompute). */
function applyExpensePatch(state: DemoState, op: Extract<DemoOp, { t: 'expense.update' }>): void {
  const expense = state.expenses.find((e) => e.id === op.id);
  if (!expense) return;
  const patch = op.d;
  if (patch.vehicle_id !== undefined) expense.vehicle_id = patch.vehicle_id;
  if (patch.date !== undefined) expense.date = patch.date;
  if (patch.amount !== undefined) expense.amount = patch.amount;
  if (patch.notes !== undefined) expense.notes = patch.notes;

  const type = patch.type ?? expense.type;
  if ((type === 'fuel' || type === 'electric_charge') && expense.fill) {
    if (patch.odometer !== undefined) expense.fill.odometer = patch.odometer;
    if (type === 'fuel') {
      if (patch.liters !== undefined) expense.fill.liters = patch.liters;
      if (patch.price_per_liter !== undefined) expense.fill.price_per_liter = patch.price_per_liter;
    } else {
      if (patch.kwh !== undefined) expense.fill.kwh = patch.kwh;
      if (patch.price_per_kwh !== undefined) expense.fill.price_per_kwh = patch.price_per_kwh;
    }
  } else if (type === 'maintenance') {
    expense.maintenance = {
      maintenance_type_id: patch.maintenance_type ?? null,
      odometer: patch.odometer ?? null,
      garage: patch.garage ?? null,
    };
    if (patch.maintenance_type) {
      upsertMaintenanceReminder(state, expense.vehicle_id, patch.maintenance_type, op.at);
    }
  } else if (type === 'other') {
    expense.label = patch.label ?? null;
  }
}

function fillExpense(id: number, at: string, d: FillData): DemoExpense {
  return {
    id,
    vehicle_id: d.vehicle_id,
    owner_id: DEMO_USER_ID,
    type: d.charge_type === 'charge' ? 'electric_charge' : 'fuel',
    amount: d.amount,
    date: d.date,
    notes: d.notes,
    created_at: at,
    fill: {
      odometer: d.odometer,
      liters: d.liters,
      price_per_liter: d.price_per_liter,
      kwh: d.kwh,
      price_per_kwh: d.price_per_kwh,
      charge_type: d.charge_type,
    },
  };
}

/** Applies one op in place. Ops referencing missing entities are no-ops. */
export function applyOp(state: DemoState, op: DemoOp): void {
  switch (op.t) {
    case 'fill.add':
      state.expenses.push(fillExpense(op.id, op.at, op.d));
      if (op.d.odometer) setVehicleOdometer(state, op.d.vehicle_id, op.d.odometer);
      return;
    case 'fill.update': {
      const index = state.expenses.findIndex((e) => e.id === op.id && e.fill);
      if (index === -1) return;
      const current = state.expenses[index];
      state.expenses[index] = {
        ...fillExpense(op.id, current.created_at, op.d),
        owner_id: current.owner_id,
      };
      if (op.d.odometer) setVehicleOdometer(state, op.d.vehicle_id, op.d.odometer);
      return;
    }
    case 'other.add':
      state.expenses.push({
        id: op.id,
        vehicle_id: op.d.vehicle_id,
        owner_id: DEMO_USER_ID,
        type: 'other',
        amount: op.d.amount,
        date: op.d.date,
        notes: op.d.notes,
        created_at: op.at,
        label: op.d.label,
      });
      return;
    case 'expense.update':
      applyExpensePatch(state, op);
      return;
    case 'expense.delete':
      state.expenses = state.expenses.filter((e) => e.id !== op.id);
      // reminders_source_expense_id_fkey ON DELETE CASCADE
      state.reminders = state.reminders.filter((r) => r.source_expense_id !== op.id);
      return;
    case 'maintenance.add':
      state.expenses.push({
        id: op.id,
        vehicle_id: op.d.vehicle_id,
        owner_id: DEMO_USER_ID,
        type: 'maintenance',
        amount: op.d.amount,
        date: op.d.date,
        notes: op.d.notes,
        created_at: op.at,
        maintenance: {
          maintenance_type_id: op.d.maintenance_type,
          odometer: op.d.odometer,
          garage: op.d.garage,
        },
      });
      upsertMaintenanceReminder(state, op.d.vehicle_id, op.d.maintenance_type, op.at);
      if (op.d.odometer) setVehicleOdometer(state, op.d.vehicle_id, op.d.odometer);
      return;
    case 'reminder.create':
      state.reminders.push({
        id: op.id,
        user_id: DEMO_USER_ID,
        ...sanitize(op.d),
        last_triggered_at: null,
        is_completed: false,
        estimated_due_date: null,
        created_at: op.at,
      });
      return;
    case 'reminder.update': {
      const reminder = state.reminders.find((r) => r.id === op.id);
      if (reminder) Object.assign(reminder, sanitize(op.d));
      return;
    }
    case 'reminder.delete':
      state.reminders = state.reminders.filter((r) => r.id !== op.id);
      return;
    case 'reminder.complete':
      completeReminder(state, op);
      return;
    case 'insurance.create':
      state.insuranceContracts.push({ id: op.id, owner_id: DEMO_USER_ID, ...sanitize(op.d) });
      return;
    case 'insurance.update': {
      const contract = state.insuranceContracts.find((c) => c.id === op.id);
      if (contract) Object.assign(contract, sanitize(op.d));
      return;
    }
    case 'insurance.delete':
      state.insuranceContracts = state.insuranceContracts.filter((c) => c.id !== op.id);
      return;
    case 'insurance.change': {
      const { close } = op;
      if (close) {
        // Only the user's own contracts can be closed (the cookie can be tampered with)
        const closed = state.insuranceContracts.find(
          (c) => c.id === close.id && c.owner_id === DEMO_USER_ID,
        );
        if (closed) closed.end_date = close.end_date;
      }
      state.insuranceContracts.push({ id: op.id, owner_id: DEMO_USER_ID, ...sanitize(op.d) });
      return;
    }
    case 'vehicle.add':
      state.vehicles.push({
        ...EMPTY_VEHICLE,
        ...sanitize(op.d),
        id: op.id,
        owner_id: DEMO_USER_ID,
        created_at: op.at,
      });
      return;
    case 'vehicle.update': {
      const vehicle = state.vehicles.find((v) => v.id === op.id);
      if (vehicle) Object.assign(vehicle, sanitize(op.d));
      return;
    }
    case 'vehicle.delete':
      state.vehicles = state.vehicles.filter((v) => v.id !== op.id);
      state.expenses = state.expenses.filter((e) => e.vehicle_id !== op.id);
      state.insuranceContracts = state.insuranceContracts.filter((c) => c.vehicle_id !== op.id);
      state.reminders = state.reminders.filter((r) => r.vehicle_id !== op.id);
      state.permissions = state.permissions.filter((p) => p.vehicle_id !== op.id);
      return;
    case 'permissions.set':
      for (const { userId, level } of op.p) {
        state.permissions = state.permissions.filter(
          (p) => !(p.vehicle_id === op.vehicleId && p.user_id === userId),
        );
        if (level !== 'none') {
          state.permissions.push({
            vehicle_id: op.vehicleId,
            user_id: userId,
            permission_level: level,
          });
        }
      }
      return;
    case 'family.rename': {
      const family = state.families.find((f) => f.id === op.id);
      if (family) family.name = op.name;
      return;
    }
    case 'preferences.update': {
      const prefs = state.preferences.find((p) => p.user_id === DEMO_USER_ID);
      if (prefs) Object.assign(prefs, sanitize(op.d), { updated_at: op.at });
      return;
    }
    case 'profile.update': {
      const user = state.users.find((u) => u.id === DEMO_USER_ID);
      if (user) user.name = op.name;
      return;
    }
  }
}
