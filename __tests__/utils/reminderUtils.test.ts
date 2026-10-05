import {
  canWriteReminder,
  enrichReminder,
  getReminderStatus,
  sortReminders,
} from '@/lib/utils/reminderUtils';

import type { Reminder, ReminderWithStatus } from '@/types/reminder';

function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 1,
    user_id: 'user-1',
    vehicle_id: 1,
    type: 'maintenance',
    title: 'Test reminder',
    description: null,
    due_date: null,
    due_odometer: null,
    is_recurring: false,
    recurrence_type: null,
    recurrence_value: null,
    last_triggered_at: null,
    is_completed: false,
    maintenance_type_id: null,
    estimated_due_date: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getReminderStatus', () => {
  it("returns 'none' when no due_date and no due_odometer", () => {
    expect(getReminderStatus(makeReminder(), null)).toBe('none');
  });

  it("returns 'overdue' for past due_date", () => {
    const r = makeReminder({ due_date: dateInDays(-1) });
    expect(getReminderStatus(r, null)).toBe('overdue');
  });

  it("returns 'due-soon' for due_date within 14 days", () => {
    const r = makeReminder({ due_date: dateInDays(10) });
    expect(getReminderStatus(r, null)).toBe('due-soon');
  });

  it("returns 'upcoming' for due_date beyond 14 days", () => {
    const r = makeReminder({ due_date: dateInDays(30) });
    expect(getReminderStatus(r, null)).toBe('upcoming');
  });

  it("returns 'overdue' when vehicle odometer has passed due_odometer", () => {
    const r = makeReminder({ due_odometer: 50000 });
    expect(getReminderStatus(r, 50001)).toBe('overdue');
  });

  it("returns 'overdue' when vehicle odometer equals due_odometer", () => {
    const r = makeReminder({ due_odometer: 50000 });
    expect(getReminderStatus(r, 50000)).toBe('overdue');
  });

  it("returns 'due-soon' when remaining km is within 500", () => {
    const r = makeReminder({ due_odometer: 50000 });
    expect(getReminderStatus(r, 49600)).toBe('due-soon');
  });

  it("returns 'upcoming' when odometer is far from due_odometer", () => {
    const r = makeReminder({ due_odometer: 50000 });
    expect(getReminderStatus(r, 40000)).toBe('upcoming');
  });

  it('km overdue beats a date still upcoming', () => {
    const r = makeReminder({ due_odometer: 50000, due_date: dateInDays(30) });
    expect(getReminderStatus(r, 50001)).toBe('overdue');
  });

  it('date overdue beats km due-soon (B13)', () => {
    const r = makeReminder({ due_odometer: 50000, due_date: dateInDays(-3) });
    expect(getReminderStatus(r, 49800)).toBe('overdue');
  });

  it('date due-soon beats km upcoming', () => {
    const r = makeReminder({ due_odometer: 50000, due_date: dateInDays(5) });
    expect(getReminderStatus(r, 30000)).toBe('due-soon');
  });

  it('km due-soon beats a date still upcoming', () => {
    const r = makeReminder({ due_odometer: 50000, due_date: dateInDays(60) });
    expect(getReminderStatus(r, 49800)).toBe('due-soon');
  });

  it('falls back to the date axis when the odometer is unknown', () => {
    const r = makeReminder({ due_odometer: 50000, due_date: dateInDays(-1) });
    expect(getReminderStatus(r, null)).toBe('overdue');
  });
});

describe('canWriteReminder', () => {
  const r = makeReminder({ user_id: 'creator' });

  it('allows the creator, even without a vehicle', () => {
    expect(canWriteReminder(r, null, 'creator')).toBe(true);
  });

  it('allows the vehicle owner and write members', () => {
    expect(canWriteReminder(r, { owner_id: 'owner', permission_level: null }, 'owner')).toBe(true);
    expect(canWriteReminder(r, { owner_id: 'owner', permission_level: 'write' }, 'member')).toBe(
      true,
    );
  });

  it('denies read members, strangers and anonymous users', () => {
    expect(canWriteReminder(r, { owner_id: 'owner', permission_level: 'read' }, 'member')).toBe(
      false,
    );
    expect(canWriteReminder(r, null, 'stranger')).toBe(false);
    expect(canWriteReminder(r, { owner_id: 'owner', permission_level: 'write' }, null)).toBe(false);
  });
});

describe('enrichReminder', () => {
  it('returns reminder with computed status', () => {
    const r = makeReminder({ due_date: dateInDays(-1) });
    const vehicle = { vehicle_id: 1, odometer: 10000, last_fill_date: null } as any;
    const result = enrichReminder(r, vehicle, []);
    expect(result.status).toBe('overdue');
  });

  it('computes remainingKm for km-based reminders', () => {
    const r = makeReminder({ due_odometer: 50000 });
    const vehicle = { vehicle_id: 1, odometer: 45000, last_fill_date: null } as any;
    const result = enrichReminder(r, vehicle, []);
    expect(result.remainingKm).toBe(5000);
  });

  it('returns null remainingKm when no due_odometer', () => {
    const r = makeReminder({ due_date: dateInDays(30) });
    const vehicle = { vehicle_id: 1, odometer: 10000, last_fill_date: null } as any;
    const result = enrichReminder(r, vehicle, []);
    expect(result.remainingKm).toBeNull();
  });
});

describe('sortReminders', () => {
  function makeWithStatus(
    id: number,
    status: ReminderWithStatus['status'],
    due_date: string | null = null,
  ): ReminderWithStatus {
    return {
      ...makeReminder({ id, due_date }),
      status,
      computedEstimatedDate: null,
      remainingKm: null,
    };
  }

  it('sorts overdue → due-soon → upcoming → none', () => {
    const reminders = [
      makeWithStatus(1, 'upcoming'),
      makeWithStatus(2, 'overdue'),
      makeWithStatus(3, 'none'),
      makeWithStatus(4, 'due-soon'),
    ];
    const sorted = sortReminders(reminders);
    expect(sorted.map((r) => r.status)).toEqual(['overdue', 'due-soon', 'upcoming', 'none']);
  });

  it('sorts by due_date ascending within the same status group', () => {
    const reminders = [
      makeWithStatus(1, 'due-soon', dateInDays(10)),
      makeWithStatus(2, 'due-soon', dateInDays(5)),
    ];
    const sorted = sortReminders(reminders);
    expect(sorted[0].id).toBe(2); // earlier date first
    expect(sorted[1].id).toBe(1);
  });

  it('places null due_dates last within a group', () => {
    const reminders = [
      makeWithStatus(1, 'upcoming', null),
      makeWithStatus(2, 'upcoming', dateInDays(20)),
    ];
    const sorted = sortReminders(reminders);
    expect(sorted[0].id).toBe(2); // has a date → comes first
    expect(sorted[1].id).toBe(1); // null → last
  });

  it('does not mutate the original array', () => {
    const reminders = [makeWithStatus(1, 'upcoming'), makeWithStatus(2, 'overdue')];
    const original = [...reminders];
    sortReminders(reminders);
    expect(reminders).toEqual(original);
  });
});
