import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_FAMILY_ID, DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
import { toISODate } from '@/lib/demo/dates';
import { buildDemoSeed } from '@/lib/demo/seed';
import {
  expensesForDisplay,
  familyMembersDisplay,
  isDerivedInsuranceId,
  usersInfo,
  vehiclesForDisplay,
} from '@/lib/demo/views';
import { detectAnomalies } from '@/lib/utils/anomalyUtils';
import { getEffectivePeriodRange } from '@/lib/utils/filterUtils';
import { computeMaintenanceSuggestions } from '@/lib/utils/maintenanceInsights';
import { getReminderStatus } from '@/lib/utils/reminderUtils';
import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const seed = () => buildDemoSeed(toISODate(new Date()));

describe('vehiclesForDisplay', () => {
  it('returns owned and shared vehicles with the viewer permission', () => {
    const rows = vehiclesForDisplay(seed(), DEMO_USER_ID);
    expect(rows.map((r) => [r.vehicle_id, r.permission_level])).toEqual([
      [DEMO_VEHICLE.peugeot308, null],
      [DEMO_VEHICLE.zoe, null],
      [DEMO_VEHICLE.niro, 'write'],
      [DEMO_VEHICLE.peugeot208, 'read'],
    ]);
    expect(rows[0].family_ids).toEqual([DEMO_FAMILY_ID]);
    expect(rows[2].owner_name).toBe('Thomas Durand');
  });

  it('computes L/100 and kWh/100 like the SQL view', () => {
    const rows = vehiclesForDisplay(seed(), DEMO_USER_ID);
    const p308 = rows.find((r) => r.vehicle_id === DEMO_VEHICLE.peugeot308)!;
    const zoe = rows.find((r) => r.vehicle_id === DEMO_VEHICLE.zoe)!;
    expect(p308.calculated_consumption).toBeGreaterThan(5.5);
    expect(p308.calculated_consumption).toBeLessThan(6.5);
    expect(zoe.calculated_consumption).toBeNull();
    // kWh/100 from charges (P2.12): the Zoé is seeded at ~15.5, the diesel 308 has none
    expect(zoe.calculated_consumption_kwh).toBeGreaterThan(14);
    expect(zoe.calculated_consumption_kwh).toBeLessThan(17);
    expect(p308.calculated_consumption_kwh).toBeNull();
    expect(p308.last_fill_date?.slice(0, 10)).toBe('2026-09-28');
    expect(p308.insurance_provider).toBe('Mutuelle des Routes');
  });
});

describe('expensesForDisplay', () => {
  it('derives monthly insurance instalments from contracts', () => {
    const rows = expensesForDisplay(seed()).filter((e) => e.type === 'insurance');
    expect(rows.every((e) => isDerivedInsuranceId(e.id))).toBe(true);
    expect(rows.every((e) => e.notes === 'Mensualité')).toBe(true);
    // 308: old contract (12 months) + current contract (15 monthly dates up to today)
    expect(rows.filter((e) => e.vehicle_id === DEMO_VEHICLE.peugeot308)).toHaveLength(27);
  });

  it('joins vehicle, owner and maintenance labels', () => {
    const maintenance = expensesForDisplay(seed()).find((e) => e.type === 'maintenance')!;
    expect(maintenance.vehicle_name).toBe('308 SW');
    expect(maintenance.owner_name).toBe('Camille Durand');
    expect(maintenance.maintenance_type_label).toBe('Contrôle technique');
  });
});

describe('usersInfo / family', () => {
  it('describes Camille like the users_info view', () => {
    const info = usersInfo(seed(), DEMO_USER_ID)!;
    expect(info.name).toBe('Camille Durand');
    expect(info.has_family).toBe(true);
    expect(info.vehicle_ids).toEqual([DEMO_VEHICLE.peugeot308, DEMO_VEHICLE.zoe]);
    expect(info.families).toEqual([
      { id: DEMO_FAMILY_ID, name: 'Famille Durand', role: 'owner', is_owner: true },
    ]);
  });

  it('lists the 3 family members', () => {
    expect(familyMembersDisplay(seed(), DEMO_FAMILY_ID).map((m) => m.user_name)).toEqual([
      'Camille Durand',
      'Thomas Durand',
      'Léa Durand',
    ]);
  });
});

describe('demo invariants (every feature has something to show)', () => {
  it('flags exactly one consumption anomaly, on the 308', () => {
    const state = seed();
    const fills = expensesForDisplay(state).filter(
      (e) => e.type === 'fuel' || e.type === 'electric_charge',
    );
    const anomalies = detectAnomalies(fills, vehiclesForDisplay(state, DEMO_USER_ID) as Vehicle[]);
    expect(anomalies.map((a) => a.vehicleId)).toEqual([DEMO_VEHICLE.peugeot308]);
  });

  it('raises at least 3 health warnings on Camille vehicles', () => {
    const state = seed();
    const reminders = state.reminders.filter((r) => r.user_id === DEMO_USER_ID);
    const expenses = expensesForDisplay(state);
    const factors = vehiclesForDisplay(state, DEMO_USER_ID).flatMap(
      (v) =>
        computeHealthScore(v as Vehicle, { reminders, expenses, hasActiveInsurance: true }).factors,
    );
    expect(factors.filter((f) => f.status !== 'good').length).toBeGreaterThanOrEqual(3);
  });

  it('suggests 2 maintenances on the 308, one overdue', () => {
    const state = seed();
    const writable = vehiclesForDisplay(state, DEMO_USER_ID).filter(
      (v) => v.owner_id === DEMO_USER_ID || v.permission_level === 'write',
    );
    const suggestions = computeMaintenanceSuggestions(
      expensesForDisplay(state),
      writable as VehicleMinimal[],
      state.maintenanceTypes,
    );
    expect(suggestions.map((s) => s.maintenanceTypeId).sort()).toEqual(['inspection', 'revision']);
    expect(suggestions.filter((s) => (s.monthsOverdue ?? 0) > 0)).toHaveLength(1);
  });

  it('has reminders in every status', () => {
    const state = seed();
    const statuses = state.reminders
      .filter((r) => !r.is_completed)
      .map((r) =>
        getReminderStatus(r, state.vehicles.find((v) => v.id === r.vehicle_id)?.odometer ?? null),
      );
    expect(new Set(statuses)).toEqual(new Set(['overdue', 'due-soon', 'upcoming']));
    expect(state.reminders.some((r) => r.is_completed)).toBe(true);
  });

  it('has expenses on 2+ vehicles in the default period and 6+ fuel fills per thermal vehicle', () => {
    const state = seed();
    const { start } = getEffectivePeriodRange('year');
    const inPeriod = expensesForDisplay(state).filter((e) => new Date(e.date) >= start!);
    expect(new Set(inPeriod.map((e) => e.vehicle_id)).size).toBeGreaterThanOrEqual(2);
    for (const id of [DEMO_VEHICLE.peugeot308, DEMO_VEHICLE.niro, DEMO_VEHICLE.peugeot208]) {
      expect(
        state.expenses.filter((e) => e.vehicle_id === id && e.type === 'fuel').length,
      ).toBeGreaterThanOrEqual(6);
    }
  });
});
