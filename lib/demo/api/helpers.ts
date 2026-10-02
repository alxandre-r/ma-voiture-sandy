import { DEMO_USER_ID } from '../constants';
import { vehiclesForDisplay } from '../views';

import type { DemoOp } from '../ops';
import type { DemoState } from '../types';
import type { DemoVehicleRow } from '../views';
import type { DemoApiResult } from './types';
import type { Expense } from '@/types/expense';

export function reply(status: number, json: unknown, op?: DemoOp): DemoApiResult {
  return op ? { status, json, op } : { status, json };
}

export function fail(status: number, error: string): DemoApiResult {
  return { status, json: { error } };
}

/** 403 with the standard demo message, e.g. unavailable('Le changement de mot de passe'). */
export function unavailable(feature: string): DemoApiResult {
  return fail(403, `${feature} n'est pas disponible dans la démo.`);
}

export function visibleVehicle(state: DemoState, vehicleId: number): DemoVehicleRow | null {
  return vehiclesForDisplay(state, DEMO_USER_ID).find((v) => v.vehicle_id === vehicleId) ?? null;
}

/** Owner, or 'write' permission (canWrite in the real routes). */
export function canWriteVehicle(vehicle: DemoVehicleRow | null): boolean {
  return !!vehicle && (vehicle.owner_id === DEMO_USER_ID || vehicle.permission_level === 'write');
}

/** ownerOrWrite in the real routes: author of the expense, or write access on its vehicle. */
export function canEditExpense(
  state: DemoState,
  expense: { owner_id: string; vehicle_id: number },
): boolean {
  if (expense.owner_id === DEMO_USER_ID) return true;
  return visibleVehicle(state, expense.vehicle_id)?.permission_level === 'write';
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function parseIdList(raw: string | null): number[] {
  return (raw ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

export const byDateDesc = (a: Expense, b: Expense) => b.date.localeCompare(a.date);
