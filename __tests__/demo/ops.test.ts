import { describe, expect, it } from 'vitest';

import { DEMO_PARTNER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '@/lib/demo/constants';
import { addDays, addMonths, toTimestamp } from '@/lib/demo/dates';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';
import { applyOp, isDemoOp, nextId } from '@/lib/demo/ops';
import { buildDemoSeed } from '@/lib/demo/seed';
import { buildDemoState } from '@/lib/demo/state';

import type { DemoOp } from '@/lib/demo/ops';

const TODAY = '2026-10-01';
const AT = `${TODAY}T15:00:00.000Z`;

describe('applyOp', () => {
  it('adds a fill and moves the vehicle odometer like fills/add', () => {
    const state = buildDemoSeed(TODAY);
    const id = nextId(state.expenses);
    applyOp(state, {
      t: 'fill.add',
      id,
      at: AT,
      d: {
        vehicle_id: DEMO_VEHICLE.peugeot308,
        date: TODAY,
        amount: 70,
        notes: null,
        odometer: 92_900,
        charge_type: 'fill',
        liters: 40,
        price_per_liter: 1.75,
        kwh: null,
        price_per_kwh: null,
      },
    });
    expect(state.expenses.find((e) => e.id === id)?.type).toBe('fuel');
    expect(state.vehicles.find((v) => v.id === DEMO_VEHICLE.peugeot308)?.odometer).toBe(92_900);
  });

  it('updates the maintenance reminder when a CT is recorded (trigger port)', () => {
    const state = buildDemoSeed(TODAY);
    applyOp(state, {
      t: 'maintenance.add',
      id: nextId(state.expenses),
      at: AT,
      d: {
        vehicle_id: DEMO_VEHICLE.peugeot308,
        date: TODAY,
        amount: 79,
        notes: null,
        maintenance_type: 'inspection',
        odometer: 92_500,
        garage: null,
      },
    });
    const ct = state.reminders.find((r) => r.id === 701)!;
    expect(ct.due_date).toBe(toTimestamp(addMonths(TODAY, 24)));
    expect(ct.last_triggered_at).toBe(AT);
  });

  it('creates a reminder for a maintenance type that has none yet', () => {
    const state = buildDemoSeed(TODAY);
    const before = state.reminders.length;
    applyOp(state, {
      t: 'maintenance.add',
      id: nextId(state.expenses),
      at: AT,
      d: {
        vehicle_id: DEMO_VEHICLE.zoe,
        date: TODAY,
        amount: 150,
        notes: null,
        maintenance_type: 'brakes',
        odometer: 39_000,
        garage: null,
      },
    });
    const created = state.reminders[before];
    expect(created).toMatchObject({
      vehicle_id: DEMO_VEHICLE.zoe,
      title: 'Freins',
      due_odometer: 69_000,
      recurrence_type: 'km',
      is_recurring: true,
      user_id: DEMO_USER_ID,
    });
  });

  it('schedules the next occurrence when a recurring reminder is completed', () => {
    const state = buildDemoSeed(TODAY);
    applyOp(state, { t: 'reminder.complete', id: 701, at: AT, done: true });
    const next = state.reminders[state.reminders.length - 1];
    expect(state.reminders.find((r) => r.id === 701)?.is_completed).toBe(true);
    expect(next.is_completed).toBe(false);
    expect(next.due_date).toBe(toTimestamp(addMonths(addDays(TODAY, 12), 24)));

    applyOp(state, { t: 'reminder.complete', id: 703, at: AT, done: true });
    const nextOil = state.reminders[state.reminders.length - 1];
    const odometer = state.vehicles.find((v) => v.id === DEMO_VEHICLE.peugeot308)!.odometer;
    expect(nextOil.due_odometer).toBe(odometer + 15_000);
  });

  it('cascades a vehicle deletion', () => {
    const state = buildDemoSeed(TODAY);
    applyOp(state, { t: 'vehicle.delete', id: DEMO_VEHICLE.zoe });
    expect(state.vehicles.some((v) => v.id === DEMO_VEHICLE.zoe)).toBe(false);
    expect(state.expenses.some((e) => e.vehicle_id === DEMO_VEHICLE.zoe)).toBe(false);
    expect(state.reminders.some((r) => r.vehicle_id === DEMO_VEHICLE.zoe)).toBe(false);
    expect(state.insuranceContracts.some((c) => c.vehicle_id === DEMO_VEHICLE.zoe)).toBe(false);
  });

  it('sets and removes permissions', () => {
    const state = buildDemoSeed(TODAY);
    applyOp(state, {
      t: 'permissions.set',
      vehicleId: DEMO_VEHICLE.peugeot308,
      p: [{ userId: DEMO_PARTNER_ID, level: 'none' }],
    });
    expect(
      state.permissions.some(
        (p) => p.vehicle_id === DEMO_VEHICLE.peugeot308 && p.user_id === DEMO_PARTNER_ID,
      ),
    ).toBe(false);
  });
});

describe('buildDemoState', () => {
  it('replays ops on top of the seed and skips malformed ones', () => {
    const ops = [
      { t: 'fill.update', id: 10_000 } as unknown as DemoOp,
      { t: 'profile.update', name: 'Camille D.' } satisfies DemoOp,
    ];
    const untouched = buildDemoSeed(TODAY).expenses.find((e) => e.id === 10_000);
    const state = buildDemoState(TODAY, ops);
    expect(untouched).toBeDefined();
    expect(state.expenses.find((e) => e.id === 10_000)).toEqual(untouched);
    expect(state.users.find((u) => u.id === DEMO_USER_ID)?.name).toBe('Camille D.');
  });
});

describe('tampered op payloads', () => {
  const replay = (ops: unknown[]) => {
    const raw = encodeJournal({ ...createJournal('s'), ops: ops as DemoOp[] });
    return buildDemoState('2026-10-01', decodeJournal(raw).ops);
  };

  it('rejects ops whose payload is not a plain object', () => {
    expect(isDemoOp({ t: 'vehicle.update', id: 101, d: 'x' })).toBe(false);
    expect(isDemoOp({ t: 'vehicle.update', id: 101, d: null })).toBe(false);
    expect(isDemoOp({ t: 'vehicle.update', id: 101, d: [] })).toBe(false);
    expect(isDemoOp({ t: 'vehicle.update', id: 101 })).toBe(false);
    expect(isDemoOp({ t: 'vehicle.update', id: 101, d: { name: 'Ok' } })).toBe(true);
    expect(isDemoOp({ t: 'vehicle.delete', id: 101 })).toBe(true);
  });

  it('cannot change the owner or id of a vehicle', () => {
    const state = replay([
      {
        t: 'vehicle.update',
        id: DEMO_VEHICLE.peugeot308,
        d: { name: 'Piratée', owner_id: 'attacker', id: 999 },
      },
    ]);
    const vehicle = state.vehicles.find((v) => v.name === 'Piratée');
    expect(vehicle).toMatchObject({ id: DEMO_VEHICLE.peugeot308, owner_id: DEMO_USER_ID });
  });

  it('cannot inject an owner through a created contract or reminder', () => {
    const state = replay([
      {
        t: 'insurance.create',
        id: 900,
        d: {
          vehicle_id: DEMO_VEHICLE.peugeot308,
          monthly_cost: 1,
          start_date: '2026-01-01',
          end_date: null,
          provider: null,
          owner_id: 'attacker',
          id: 1,
        },
      },
      {
        t: 'reminder.create',
        id: 900,
        at: '2026-10-01T08:00:00.000Z',
        d: {
          vehicle_id: DEMO_VEHICLE.peugeot308,
          type: 'date',
          title: 'Piraté',
          description: null,
          due_date: null,
          due_odometer: null,
          is_recurring: false,
          recurrence_type: null,
          recurrence_value: null,
          maintenance_type_id: null,
          user_id: 'attacker',
          id: 1,
        },
      },
    ]);
    expect(state.insuranceContracts.find((c) => c.id === 900)?.owner_id).toBe(DEMO_USER_ID);
    expect(state.reminders.find((r) => r.id === 900)?.user_id).toBe(DEMO_USER_ID);
  });
});
