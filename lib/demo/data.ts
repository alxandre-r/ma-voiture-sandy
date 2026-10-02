/**
 * @file lib/demo/data.ts
 * @description Demo equivalent of every lib/data fetcher: same name, same result shape.
 * Each fetcher starts with `if (demo) return demoData.<name>(demo.state, …)`.
 */

import { sortByStartDesc } from '@/lib/utils/insuranceUtils';

import { DEMO_USER_ID } from './constants';
import {
  expensesForDisplay,
  familyMembersDisplay,
  familyRow,
  usersInfo,
  vehiclesForDisplay,
} from './views';

import type { DemoState } from './types';
import type { DemoVehicleRow } from './views';
import type { Expense } from '@/types/expense';
import type { InsuranceData, InsuranceVehicleRef } from '@/types/insurance';
import type { Reminder } from '@/types/reminder';
import type { UserPreferences } from '@/types/userPreferences';

const byCreatedAtDesc = (a: { created_at?: string | null }, b: { created_at?: string | null }) =>
  (b.created_at ?? '').localeCompare(a.created_at ?? '');
const byDateDesc = (a: Expense, b: Expense) => b.date.localeCompare(a.date);
const byDueDateAsc = (a: Reminder, b: Reminder) =>
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');

function toMinimal(v: DemoVehicleRow) {
  return {
    vehicle_id: v.vehicle_id,
    owner_id: v.owner_id,
    owner_name: v.owner_name,
    family_ids: v.family_ids,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    odometer: v.odometer,
    color: v.color,
    fuel_type: v.fuel_type,
    status: v.status,
    permission_level: v.permission_level,
  };
}

/* ----- user ----- */

export function getCurrentUserInfo(state: DemoState) {
  return usersInfo(state, DEMO_USER_ID);
}

export const getUserInfo = getCurrentUserInfo;

export function getUserFamilyIds(state: DemoState): string[] {
  return state.familyMembers.filter((m) => m.user_id === DEMO_USER_ID).map((m) => m.family_id);
}

export function getUserFamilyId(state: DemoState): string | null {
  return getUserFamilyIds(state)[0] ?? null;
}

export function getUserFamilies(state: DemoState): { id: string; name: string }[] {
  return getUserFamilyIds(state).flatMap((id) => {
    const family = state.families.find((f) => f.id === id);
    return family ? [{ id: family.id, name: family.name }] : [];
  });
}

export function getPreferencesByUserId(state: DemoState, userId: string): UserPreferences | null {
  const prefs = state.preferences.find((p) => p.user_id === userId);
  return prefs ? { ...prefs } : null;
}

export function getUserPreferences(state: DemoState): UserPreferences | null {
  return getPreferencesByUserId(state, DEMO_USER_ID);
}

/* ----- vehicles ----- */

export function getUserVehicles(state: DemoState): DemoVehicleRow[] {
  return vehiclesForDisplay(state, DEMO_USER_ID)
    .filter((v) => v.owner_id === DEMO_USER_ID)
    .sort(byCreatedAtDesc);
}

export function getUserVehiclesMinimal(state: DemoState) {
  return getUserVehicles(state).map(toMinimal);
}

export function getFamilyVehicles(state: DemoState, familyId?: string): DemoVehicleRow[] {
  if (!familyId) return [];
  return vehiclesForDisplay(state, DEMO_USER_ID)
    .filter((v) => v.family_ids?.includes(familyId) && v.owner_id !== DEMO_USER_ID)
    .sort(byCreatedAtDesc);
}

export function getFamilyVehiclesMinimal(state: DemoState, familyId?: string) {
  return getFamilyVehicles(state, familyId).map(toMinimal);
}

export function getFamilyAllVehicles(state: DemoState, familyId?: string) {
  if (!familyId) return [];
  return vehiclesForDisplay(state, DEMO_USER_ID)
    .filter((v) => v.family_ids?.includes(familyId))
    .sort(byCreatedAtDesc)
    .map((v) => ({
      vehicle_id: v.vehicle_id,
      owner_id: v.owner_id,
      owner_name: v.owner_name,
      make: v.make,
      model: v.model,
      year: v.year,
      image: v.image,
      name: v.name,
      permission_level: v.permission_level,
    }));
}

/* ----- expenses & maintenance ----- */

export function getAllExpenses(state: DemoState, vehicleIds: number[]): Expense[] {
  return expensesForDisplay(state)
    .filter((e) => vehicleIds.includes(e.vehicle_id))
    .sort(byDateDesc);
}

export function getMaintenanceExpenses(state: DemoState, vehicleIds: number[] = []): Expense[] {
  return expensesForDisplay(state)
    .filter(
      (e) =>
        e.type === 'maintenance' && (vehicleIds.length === 0 || vehicleIds.includes(e.vehicle_id)),
    )
    .sort(byDateDesc);
}

export function getFillExpenses(state: DemoState, vehicleIds: number[]): Expense[] {
  return expensesForDisplay(state)
    .filter(
      (e) =>
        (e.type === 'fuel' || e.type === 'electric_charge') && vehicleIds.includes(e.vehicle_id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getMaintenanceTypes(state: DemoState) {
  return Object.fromEntries(
    Object.entries(state.maintenanceTypes).map(([id, type]) => [id, { ...type }]),
  );
}

/* ----- reminders ----- */

export function getReminders(state: DemoState, vehicleIds: number[] = []): Reminder[] {
  return state.reminders
    .filter(
      (r) =>
        r.user_id === DEMO_USER_ID ||
        (vehicleIds.length > 0 && r.vehicle_id !== null && vehicleIds.includes(r.vehicle_id)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({ ...r }));
}

export function getVehicleReminders(state: DemoState, vehicleId: number): Reminder[] {
  return state.reminders
    .filter((r) => r.user_id === DEMO_USER_ID && r.vehicle_id === vehicleId && !r.is_completed)
    .sort(byDueDateAsc)
    .map((r) => ({ ...r }));
}

/** Same rule as getOverdueCount: own, active, date-based reminders due within 14 days. */
export function getOverdueCount(state: DemoState, now: Date = new Date()) {
  const soon = now.getTime() + 14 * 86_400_000;
  let overdue = 0;
  let dueSoon = 0;
  for (const r of state.reminders) {
    if (r.user_id !== DEMO_USER_ID || r.is_completed || !r.due_date) continue;
    const due = new Date(r.due_date).getTime();
    if (due >= soon) continue;
    if (due < now.getTime()) overdue += 1;
    else dueSoon += 1;
  }
  return { overdue, dueSoon };
}

/* ----- insurance & family ----- */

export function getFamilyInfo(state: DemoState, familyId: string) {
  return familyRow(state, familyId);
}

export function getFamilyMembers(state: DemoState, familyId: string) {
  return familyMembersDisplay(state, familyId);
}

/** Same contract as lib/data getInsuranceData: hides family vehicles whose owner disabled show_insurance. */
export function getInsuranceData(state: DemoState, vehicles: InsuranceVehicleRef[]): InsuranceData {
  const hiddenVehicleIds = vehicles
    .filter(
      (v) =>
        v.owner_id &&
        v.owner_id !== DEMO_USER_ID &&
        getPreferencesByUserId(state, v.owner_id)?.show_insurance === false,
    )
    .map((v) => v.vehicle_id);
  const visibleIds = new Set(
    vehicles.map((v) => v.vehicle_id).filter((id) => !hiddenVehicleIds.includes(id)),
  );
  const contracts = sortByStartDesc(
    state.insuranceContracts
      .filter((c) => visibleIds.has(c.vehicle_id))
      .map((c) => ({ ...c, attachments: [] })),
  );
  return { contracts, hiddenVehicleIds };
}
