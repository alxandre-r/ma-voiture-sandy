import { describe, expect, it } from 'vitest';

import {
  DEMO_DAUGHTER_ID,
  DEMO_FAMILY_ID,
  DEMO_PARTNER_ID,
  DEMO_USER_ID,
  DEMO_VEHICLE,
} from '@/lib/demo/constants';
import * as demoData from '@/lib/demo/data';
import { buildDemoSeed } from '@/lib/demo/seed';

const TODAY = '2026-10-01';
const state = () => buildDemoSeed(TODAY);
const allIds = Object.values(DEMO_VEHICLE);

describe('demo data (lib/data equivalents)', () => {
  it('returns Camille as current user with her family', () => {
    expect(demoData.getCurrentUserInfo(state())?.id).toBe(DEMO_USER_ID);
    expect(demoData.getUserFamilyIds(state())).toEqual([DEMO_FAMILY_ID]);
    expect(demoData.getUserFamilies(state())).toEqual([
      { id: DEMO_FAMILY_ID, name: 'Famille Durand' },
    ]);
  });

  it('splits own and family vehicles, newest first', () => {
    expect(demoData.getUserVehicles(state()).map((v) => v.vehicle_id)).toEqual([
      DEMO_VEHICLE.zoe,
      DEMO_VEHICLE.peugeot308,
    ]);
    expect(demoData.getFamilyVehicles(state(), DEMO_FAMILY_ID).map((v) => v.vehicle_id)).toEqual([
      DEMO_VEHICLE.peugeot208,
      DEMO_VEHICLE.niro,
    ]);
    expect(demoData.getFamilyVehicles(state(), undefined)).toEqual([]);
    expect(demoData.getFamilyAllVehicles(state(), DEMO_FAMILY_ID)).toHaveLength(4);
    expect(Object.keys(demoData.getUserVehiclesMinimal(state())[0]).sort()).toEqual(
      [
        'color',
        'family_ids',
        'fuel_type',
        'make',
        'model',
        'name',
        'odometer',
        'owner_id',
        'owner_name',
        'permission_level',
        'status',
        'vehicle_id',
        'year',
      ].sort(),
    );
  });

  it('filters and orders expenses like the SQL queries', () => {
    const all = demoData.getAllExpenses(state(), [DEMO_VEHICLE.peugeot308]);
    expect(all.every((e) => e.vehicle_id === DEMO_VEHICLE.peugeot308)).toBe(true);
    expect(all.every((e, i) => i === 0 || all[i - 1].date >= e.date)).toBe(true);
    expect(demoData.getMaintenanceExpenses(state()).every((e) => e.type === 'maintenance')).toBe(
      true,
    );
    const fills = demoData.getFillExpenses(state(), allIds);
    expect(fills.every((e, i) => i === 0 || fills[i - 1].date <= e.date)).toBe(true);
  });

  it('returns own reminders, plus the ones on accessible vehicles when ids are given', () => {
    expect(demoData.getReminders(state()).every((r) => r.user_id === DEMO_USER_ID)).toBe(true);
    expect(demoData.getReminders(state(), allIds).some((r) => r.user_id === DEMO_DAUGHTER_ID)).toBe(
      true,
    );
  });

  it('counts overdue and due-soon reminders for the sidebar badge', () => {
    expect(demoData.getOverdueCount(state(), new Date(`${TODAY}T10:00:00Z`))).toEqual({
      overdue: 1,
      dueSoon: 1,
    });
  });

  it('considers a vehicle insured whoever holds the active contract', () => {
    expect(demoData.getActiveInsuranceVehicleIds(state(), allIds).sort()).toEqual(
      [...allIds].sort(),
    );
  });

  it('returns copies so callers cannot corrupt the state', () => {
    const s = state();
    const types = demoData.getMaintenanceTypes(s);
    types.revision.interval_months = 99;
    expect(s.maintenanceTypes.revision.interval_months).toBe(12);
    expect(demoData.getPreferencesByUserId(s, DEMO_DAUGHTER_ID)?.show_financials).toBe(false);
  });
});

describe('getInsuranceData (demo)', () => {
  const vehicles = [
    { vehicle_id: DEMO_VEHICLE.zoe, owner_id: DEMO_USER_ID },
    { vehicle_id: DEMO_VEHICLE.niro, owner_id: DEMO_PARTNER_ID },
  ];

  it('returns the contracts of the given vehicles, newest first', () => {
    const data = demoData.getInsuranceData(state(), vehicles);
    expect(data.hiddenVehicleIds).toEqual([]);
    expect(new Set(data.contracts.map((c) => c.vehicle_id))).toEqual(
      new Set([DEMO_VEHICLE.zoe, DEMO_VEHICLE.niro]),
    );
    const starts = data.contracts.map((c) => c.start_date);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('hides family vehicles whose owner turned show_insurance off', () => {
    const s = state();
    s.preferences.find((p) => p.user_id === DEMO_PARTNER_ID)!.show_insurance = false;
    const data = demoData.getInsuranceData(s, vehicles);
    expect(data.hiddenVehicleIds).toEqual([DEMO_VEHICLE.niro]);
    expect(data.contracts.some((c) => c.vehicle_id === DEMO_VEHICLE.niro)).toBe(false);
  });
});
