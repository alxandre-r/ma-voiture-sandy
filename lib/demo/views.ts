/**
 * @file lib/demo/views.ts
 * @description Demo equivalents of the SQL views (__info__/current_schema/views.sql), same column names.
 */

import { energyConsumption } from '@/lib/utils/consumption';
import { getInstalmentDates } from '@/lib/utils/insuranceUtils';

import { DERIVED_INSURANCE_ID_BASE } from './constants';

import type { DemoExpense, DemoInsuranceContract, DemoState } from './types';
import type { Attachment } from '@/types/attachment';
import type { Expense } from '@/types/expense';
import type { FamilyMemberDisplay } from '@/types/family';
import type { User } from '@/types/user';
import type { Vehicle } from '@/types/vehicle';

export type DemoVehicleRow = Vehicle & {
  owner_id: string;
  owner_name: string | null;
  family_id: string | null;
  family_ids: string[] | null;
  insurance_id: number | null;
  insurance_monthly_cost: number | null;
  insurance_start_date: string | null;
  insurance_owner_id: string | null;
  insurance_end_date: string | null;
  insurance_provider: string | null;
  attachments: Attachment[];
};

export type DemoUserInfo = User & { has_vehicle: boolean };

const userName = (state: DemoState, userId: string) =>
  state.users.find((u) => u.id === userId)?.name ?? null;

function latestContract(state: DemoState, vehicleId: number): DemoInsuranceContract | null {
  return (
    state.insuranceContracts
      .filter((c) => c.vehicle_id === vehicleId)
      .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id)[0] ?? null
  );
}

function lastFillDate(state: DemoState, vehicleId: number): string | null {
  return state.expenses
    .filter((e) => e.vehicle_id === vehicleId && e.fill)
    .reduce<
      string | null
    >((latest, e) => (latest && latest > e.created_at ? latest : e.created_at), null);
}

/** Same formulas as vehicles_for_display.calculated_consumption(_kwh), rounded to 0.1. */
function calculatedConsumption(
  state: DemoState,
  vehicleId: number,
  energy: 'fuel' | 'electric',
): number | null {
  const { per100 } = energyConsumption(
    state.expenses
      .filter((e) => e.vehicle_id === vehicleId && e.fill)
      .map((e) => ({ vehicle_id: e.vehicle_id, type: e.type, ...e.fill })),
    energy,
  );
  return per100 == null ? null : Math.round(per100 * 10) / 10;
}

export function vehiclesForDisplay(state: DemoState, viewerId: string): DemoVehicleRow[] {
  const rows: DemoVehicleRow[] = [];
  for (const vehicle of state.vehicles) {
    const permission = state.permissions.find(
      (p) => p.vehicle_id === vehicle.id && p.user_id === viewerId,
    );
    if (vehicle.owner_id !== viewerId && !permission) continue;
    const familyIds = state.familyMembers
      .filter((m) => m.user_id === vehicle.owner_id)
      .map((m) => m.family_id);
    const contract = latestContract(state, vehicle.id);
    rows.push({
      vehicle_id: vehicle.id,
      owner_id: vehicle.owner_id,
      owner_name: userName(state, vehicle.owner_id),
      permission_level: permission?.permission_level ?? null,
      family_id: familyIds.length === 1 ? familyIds[0] : null,
      family_ids: familyIds.length > 0 ? familyIds : null,
      name: vehicle.name?.trim() ? vehicle.name : `${vehicle.make} ${vehicle.model}`,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      fuel_type: vehicle.fuel_type,
      odometer: vehicle.odometer,
      plate: vehicle.plate,
      color: vehicle.color,
      created_at: vehicle.created_at,
      status: vehicle.status,
      vin: vehicle.vin,
      transmission: vehicle.transmission,
      image: vehicle.image,
      tech_control_expiry: vehicle.tech_control_expiry,
      financing_mode: vehicle.financing_mode,
      purchase_date: vehicle.purchase_date,
      purchase_price: vehicle.purchase_price,
      co2_emission: vehicle.co2_emission,
      last_fill_date: lastFillDate(state, vehicle.id),
      calculated_consumption: calculatedConsumption(state, vehicle.id, 'fuel'),
      calculated_consumption_kwh: calculatedConsumption(state, vehicle.id, 'electric'),
      insurance_id: contract?.id ?? null,
      insurance_owner_id: contract?.owner_id ?? null,
      insurance_monthly_cost: contract?.monthly_cost ?? null,
      insurance_start_date: contract?.start_date ?? null,
      insurance_end_date: contract?.end_date ?? null,
      insurance_provider: contract?.provider ?? null,
      attachments: [],
    });
  }
  return rows;
}

function toExpenseRow(state: DemoState, expense: DemoExpense): Expense {
  const vehicle = state.vehicles.find((v) => v.id === expense.vehicle_id);
  const typeId = expense.maintenance?.maintenance_type_id ?? null;
  return {
    id: expense.id,
    vehicle_id: expense.vehicle_id,
    vehicle_name: vehicle?.name ?? null,
    owner_id: expense.owner_id,
    owner_name: userName(state, expense.owner_id),
    type: expense.type,
    amount: expense.amount,
    date: expense.date,
    notes: expense.notes,
    odometer: expense.fill?.odometer ?? expense.maintenance?.odometer ?? null,
    label: expense.type === 'other' ? (expense.label ?? null) : null,
    maintenance_type: typeId,
    maintenance_type_label: typeId ? (state.maintenanceTypes[typeId]?.label_fr ?? null) : null,
    garage: expense.maintenance?.garage ?? null,
    liters: expense.fill?.liters ?? null,
    price_per_liter: expense.fill?.price_per_liter ?? null,
    kwh: expense.fill?.kwh ?? null,
    price_per_kwh: expense.fill?.price_per_kwh ?? null,
    charge_type: expense.fill?.charge_type ?? null,
    attachments: [],
  };
}

export function isDerivedInsuranceId(id: number): boolean {
  return id >= DERIVED_INSURANCE_ID_BASE;
}

/** Monthly instalments from start_date to min(end_date, today), like the API backfill and SQL triggers. */
export function insuranceInstalments(state: DemoState, contract: DemoInsuranceContract): Expense[] {
  const vehicleName = state.vehicles.find((v) => v.id === contract.vehicle_id)?.name ?? null;
  return getInstalmentDates(contract.start_date, contract.end_date, state.today).map(
    (date, i): Expense => ({
      id: DERIVED_INSURANCE_ID_BASE + contract.id * 1000 + i,
      vehicle_id: contract.vehicle_id,
      vehicle_name: vehicleName,
      owner_id: contract.owner_id,
      owner_name: userName(state, contract.owner_id),
      type: 'insurance',
      amount: contract.monthly_cost,
      date,
      notes: 'Mensualité',
      odometer: null,
      label: null,
      maintenance_type: null,
      maintenance_type_label: null,
      garage: null,
      liters: null,
      price_per_liter: null,
      kwh: null,
      price_per_kwh: null,
      charge_type: null,
      attachments: [],
    }),
  );
}

export function expensesForDisplay(state: DemoState): Expense[] {
  return [
    ...state.expenses.map((expense) => toExpenseRow(state, expense)),
    ...state.insuranceContracts.flatMap((contract) => insuranceInstalments(state, contract)),
  ];
}

export function usersInfo(state: DemoState, userId: string): DemoUserInfo | null {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;
  const vehicleIds = state.vehicles
    .filter((v) => v.owner_id === userId)
    .map((v) => v.id)
    .sort((a, b) => a - b);
  const families = state.familyMembers
    .filter((m) => m.user_id === userId)
    .flatMap((m) => {
      const family = state.families.find((f) => f.id === m.family_id);
      return family
        ? [{ id: family.id, name: family.name, role: m.role, is_owner: family.owner_id === userId }]
        : [];
    });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    has_family: families.length > 0,
    has_vehicle: vehicleIds.length > 0,
    has_vehicles: vehicleIds.length > 0,
    vehicle_count: vehicleIds.length,
    vehicle_ids: vehicleIds,
    families,
  };
}

export function familyRow(state: DemoState, familyId: string) {
  const family = state.families.find((f) => f.id === familyId);
  return family
    ? {
        id: family.id,
        name: family.name,
        created_at: family.created_at,
        owner_id: family.owner_id,
        invite_token: family.invite_token,
      }
    : null;
}

export function familyMembersDisplay(state: DemoState, familyId: string): FamilyMemberDisplay[] {
  return state.familyMembers
    .filter((m) => m.family_id === familyId)
    .flatMap((m) => {
      const user = state.users.find((u) => u.id === m.user_id);
      return user
        ? [
            {
              user_id: user.id,
              user_name: user.name,
              email: user.email,
              role: m.role,
              joined_at: m.joined_at,
              avatar_url: user.avatar_url ?? undefined,
            },
          ]
        : [];
    });
}
