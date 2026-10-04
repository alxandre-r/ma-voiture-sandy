import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ReminderCard from '@/app/(app)/reminders/components/ReminderCard';
import { DEMO_VEHICLE } from '@/lib/demo/constants';
import { getReminders } from '@/lib/demo/data';
import { applyOp, nextId } from '@/lib/demo/ops';
import { buildDemoSeed } from '@/lib/demo/seed';

import type { ReminderWithStatus } from '@/types/reminder';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));

const TODAY = '2026-10-01';
const AT = `${TODAY}T15:00:00.000Z`;

/** Records a CT on the 308 (seed reminder 701 is its automatic "Contrôle technique"). */
function recordInspection() {
  const state = buildDemoSeed(TODAY);
  const id = nextId(state.expenses);
  applyOp(state, {
    t: 'maintenance.add',
    id,
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
  return { state, id };
}

describe('automatic reminder ↔ source maintenance (P3.12, demo twin of SQL -08)', () => {
  it('links the reminder to the maintenance it is computed from, and embeds its date', () => {
    const { state, id } = recordInspection();
    expect(state.reminders.find((r) => r.id === 701)?.source_expense_id).toBe(id);
    const listed = getReminders(state).find((r) => r.id === 701);
    expect(listed?.source_expense).toEqual({ id, date: TODAY });
  });

  it('deletes the reminder with its maintenance (ON DELETE CASCADE)', () => {
    const { state, id } = recordInspection();
    applyOp(state, { t: 'expense.delete', id });
    expect(state.reminders.find((r) => r.id === 701)).toBeUndefined();
  });
});

describe('ReminderCard', () => {
  const handlers = { onComplete: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const base: ReminderWithStatus = {
    id: 1,
    user_id: 'u',
    vehicle_id: 1,
    type: 'maintenance',
    title: 'Vidange',
    description: null,
    due_date: '2027-01-01T00:00:00Z',
    due_odometer: null,
    is_recurring: false,
    recurrence_type: null,
    recurrence_value: null,
    last_triggered_at: null,
    is_completed: false,
    maintenance_type_id: 'oil_change',
    estimated_due_date: null,
    created_at: '2026-01-01T00:00:00Z',
    status: 'upcoming',
    computedEstimatedDate: null,
    remainingKm: null,
  };

  it('links to the source maintenance of an automatic reminder', () => {
    render(
      <ReminderCard
        {...handlers}
        reminder={{ ...base, source_expense: { id: 42, date: '2026-03-15' } }}
      />,
    );
    const link = screen.getByRole('link', { name: /Créé automatiquement depuis l'entretien du/ });
    expect(link.getAttribute('href')).toBe('/maintenance?expenseId=42');
    expect(link.textContent).toContain('15/03/2026');
  });

  it('shows no link for a reminder without source', () => {
    render(<ReminderCard {...handlers} reminder={base} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
