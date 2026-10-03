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
  it('returns score 100 and grade A for a vehicle with no issues', () => {
    const result = computeHealthScore(makeVehicle());
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.factors).toHaveLength(0);
  });

  describe('tech control', () => {
    it('applies -25 penalty for expired tech control', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-10) }));
      expect(result.score).toBe(75);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('critical');
    });

    it('applies -10 penalty when tech control expires within 30 days', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(15) }));
      expect(result.score).toBe(90);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('warning');
    });

    it('applies no penalty when tech control is valid beyond 30 days', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(60) }));
      expect(result.score).toBe(100);
      expect(result.factors.find((f) => f.label === 'Contrôle technique')?.status).toBe('good');
    });
  });

  describe('insurance', () => {
    it('applies -20 penalty when hasActiveInsurance is false', () => {
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: false });
      expect(result.score).toBe(80);
    });

    it('applies no penalty when hasActiveInsurance is true', () => {
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: true });
      expect(result.score).toBe(100);
    });

    it('applies no insurance penalty when hasActiveInsurance is undefined (data unavailable)', () => {
      const result = computeHealthScore(makeVehicle(), {});
      expect(result.score).toBe(100);
    });
  });

  describe('reminders', () => {
    it('applies -20 per overdue reminder', () => {
      const v = makeVehicle();
      expect(computeHealthScore(v, { reminders: [makeOverdueReminder(1)] }).score).toBe(80);
    });

    it('caps overdue penalty at -40 for 2+ overdue reminders', () => {
      const v = makeVehicle();
      const result2 = computeHealthScore(v, {
        reminders: [makeOverdueReminder(1), makeOverdueReminder(2)],
      });
      expect(result2.score).toBe(60); // -40

      const result3 = computeHealthScore(v, {
        reminders: [makeOverdueReminder(1), makeOverdueReminder(2), makeOverdueReminder(3)],
      });
      expect(result3.score).toBe(60); // still -40 (capped)
    });

    it('applies -10 per due-soon reminder', () => {
      const v = makeVehicle();
      expect(computeHealthScore(v, { reminders: [makeDueSoonReminder(1)] }).score).toBe(90);
    });

    it('caps due-soon penalty at -20 for 2+ due-soon reminders', () => {
      const v = makeVehicle();
      const result2 = computeHealthScore(v, {
        reminders: [makeDueSoonReminder(1), makeDueSoonReminder(2)],
      });
      expect(result2.score).toBe(80);

      const result3 = computeHealthScore(v, {
        reminders: [makeDueSoonReminder(1), makeDueSoonReminder(2), makeDueSoonReminder(3)],
      });
      expect(result3.score).toBe(80); // capped
    });

    it('ignores completed reminders', () => {
      const completed = { ...makeOverdueReminder(1), is_completed: true };
      const result = computeHealthScore(makeVehicle(), { reminders: [completed] });
      expect(result.score).toBe(100);
    });
  });

  describe('combined penalties', () => {
    it('accumulates multiple penalties', () => {
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-5) }), {
        hasActiveInsurance: false,
        reminders: [makeOverdueReminder(1)],
      });
      // -25 (CT) -20 (insurance) -20 (1 overdue) = -65 → score 35
      expect(result.score).toBe(35);
    });
  });

  describe('score floor', () => {
    it('score never goes below 0', () => {
      const manyOverdue = [1, 2, 3].map(makeOverdueReminder);
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-30) }), {
        hasActiveInsurance: false,
        reminders: manyOverdue,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('grade thresholds', () => {
    it('score >= 80 → A', () => {
      // Score 80: -20 insurance penalty
      const result = computeHealthScore(makeVehicle(), { hasActiveInsurance: false });
      expect(result.score).toBe(80);
      expect(result.grade).toBe('A');
    });

    it('score >= 60 and < 80 → B', () => {
      // Score 75: -25 expired CT
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-1) }));
      expect(result.score).toBe(75);
      expect(result.grade).toBe('B');
    });

    it('score >= 40 and < 60 → C', () => {
      // Score 55: -25 expired CT, -20 no insurance
      const result = computeHealthScore(makeVehicle({ tech_control_expiry: daysFromNow(-1) }), {
        hasActiveInsurance: false,
      });
      expect(result.score).toBe(55);
      expect(result.grade).toBe('C');
    });
  });
});
