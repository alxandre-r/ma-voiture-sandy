import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    vehicle_id: 1,
    last_fill_date: null,
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function makeOverdueReminder(id: number): Reminder {
  const past = new Date();
  past.setDate(past.getDate() - 1);
  return {
    id,
    user_id: 'u',
    vehicle_id: 1,
    type: 'maintenance',
    title: 'Test',
    description: null,
    due_date: past.toISOString(),
    due_odometer: null,
    is_recurring: false,
    recurrence_type: null,
    recurrence_value: null,
    last_triggered_at: null,
    is_completed: false,
    maintenance_type_id: null,
    estimated_due_date: null,
    created_at: '2024-01-01T00:00:00Z',
  };
}

function makeDueSoonReminder(id: number): Reminder {
  const soon = new Date();
  soon.setDate(soon.getDate() + 7); // 7 days → within 14d threshold
  return { ...makeOverdueReminder(id), due_date: soon.toISOString() };
}

describe('computeHealthScore', () => {
  it('returns score 10 and grade A for a vehicle with no issues', () => {
    const result = computeHealthScore(makeVehicle());
    expect(result.score).toBe(10);
    expect(result.grade).toBe('A');
    expect(result.factors).toHaveLength(0);
  });

  describe('tech control', () => {
    it('applies -3 penalty for expired tech control', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-10) }));
      expect(result.score).toBe(7);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('critical');
    });

    it('applies -1 penalty when tech control expires within 30 days', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(15) }));
      expect(result.score).toBe(9);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('warning');
    });

    it('applies no penalty when tech control is valid beyond 30 days', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(60) }));
      expect(result.score).toBe(10);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('good');
    });
  });

  describe('insurance', () => {
    it('applies -2 penalty when hasActiveInsurance is false', () => {
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: false });
      expect(result.score).toBe(8);
    });

    it('applies no penalty when hasActiveInsurance is true', () => {
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: true });
      expect(result.score).toBe(10);
    });

    it('applies no insurance penalty when hasActiveInsurance is undefined (data unavailable)', () => {
      const result = computeHealthScore(makeVehicle(), {});
      expect(result.score).toBe(10);
    });
  });

  describe('reminders', () => {
    it('applies -2 per overdue reminder', () => {
      const v = makeVehicle();
      expect(computeHealthScore(v, { reminders: [makeOverdueReminder(1)] }).score).toBe(8);
    });

    it('caps overdue penalty at -4 for 2+ overdue reminders', () => {
      const v = makeVehicle();
      const result2 = computeHealthScore(v, {
        reminders: [makeOverdueReminder(1), makeOverdueReminder(2)],
      });
      expect(result2.score).toBe(6); // -4

      const result3 = computeHealthScore(v, {
        reminders: [makeOverdueReminder(1), makeOverdueReminder(2), makeOverdueReminder(3)],
      });
      expect(result3.score).toBe(6); // still -4 (capped)
    });

    it('applies -1 per due-soon reminder', () => {
      const v = makeVehicle();
      expect(computeHealthScore(v, { reminders: [makeDueSoonReminder(1)] }).score).toBe(9);
    });

    it('caps due-soon penalty at -2 for 2+ due-soon reminders', () => {
      const v = makeVehicle();
      const result2 = computeHealthScore(v, {
        reminders: [makeDueSoonReminder(1), makeDueSoonReminder(2)],
      });
      expect(result2.score).toBe(8);

      const result3 = computeHealthScore(v, {
        reminders: [makeDueSoonReminder(1), makeDueSoonReminder(2), makeDueSoonReminder(3)],
      });
      expect(result3.score).toBe(8); // capped
    });

    it('ignores completed reminders', () => {
      const completed = { ...makeOverdueReminder(1), is_completed: true };
      const result = computeHealthScore(makeVehicle(), { reminders: [completed] });
      expect(result.score).toBe(10);
    });
  });

  describe('combined penalties', () => {
    it('accumulates multiple penalties', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-5) }), {
        hasActiveInsurance: false,
        reminders: [makeOverdueReminder(1)],
      });
      // -3 (CT) -2 (insurance) -2 (1 overdue) = -7 → score 3
      expect(result.score).toBe(3);
      expect(result.grade).toBe('D');
    });
  });

  describe('score floor', () => {
    it('score never goes below 0', () => {
      const manyOverdue = [1, 2, 3].map(makeOverdueReminder);
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-30) }), {
        hasActiveInsurance: false,
        reminders: manyOverdue,
      });
      // -3 (CT) -2 (insurance) -4 (overdue, capped) = -9 → 1
      expect(result.score).toBe(1);
      expect(result.grade).toBe('F');
    });
  });

  describe('grade thresholds', () => {
    it('score >= 8 → A', () => {
      // Score 8: -2 insurance penalty
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: false });
      expect(result.score).toBe(8);
      expect(result.grade).toBe('A');
    });

    it('score >= 6 and < 8 → B', () => {
      // Score 7: -3 expired CT
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-1) }));
      expect(result.score).toBe(7);
      expect(result.grade).toBe('B');
    });

    it('score >= 4 and < 6 → C', () => {
      // Score 5: -3 expired CT, -2 no insurance
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-1) }), {
        hasActiveInsurance: false,
      });
      expect(result.score).toBe(5);
      expect(result.grade).toBe('C');
    });
  });
});
