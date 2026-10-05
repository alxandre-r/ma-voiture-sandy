import { canWriteVehicle } from '@/lib/utils/vehicleAccess';

import type { Expense } from '@/types/expense';
import type { Reminder, ReminderStatus, ReminderWithStatus } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

/** Days threshold below which a reminder is "due soon" */
const DUE_SOON_DAYS = 14;

/** Km threshold below which a km-based reminder is "due soon" */
const DUE_SOON_KM = 500;

/** Lower rank = more urgent. */
const STATUS_URGENCY: Record<ReminderStatus, number> = {
  overdue: 0,
  'due-soon': 1,
  upcoming: 2,
  none: 3,
};

const mostUrgent = (a: ReminderStatus, b: ReminderStatus): ReminderStatus =>
  STATUS_URGENCY[a] <= STATUS_URGENCY[b] ? a : b;

/**
 * Compute the status of a reminder based on due date, due odometer, and vehicle odometer.
 * Both axes are evaluated and the most urgent one wins (a date overdue beats a km due-soon).
 */
export function getReminderStatus(
  reminder: Reminder,
  vehicleOdometer: number | null,
): ReminderStatus {
  if (reminder.due_date === null && reminder.due_odometer === null) return 'none';

  let status: ReminderStatus = 'upcoming';

  // Odometer-based trigger
  if (reminder.due_odometer !== null && vehicleOdometer !== null) {
    if (vehicleOdometer >= reminder.due_odometer) {
      status = mostUrgent(status, 'overdue');
    } else if (reminder.due_odometer - vehicleOdometer <= DUE_SOON_KM) {
      status = mostUrgent(status, 'due-soon');
    }
  }

  // Date-based trigger
  if (reminder.due_date !== null) {
    const now = new Date();
    const due = new Date(reminder.due_date);
    const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (due <= now) {
      status = mostUrgent(status, 'overdue');
    } else if (daysUntilDue <= DUE_SOON_DAYS) {
      status = mostUrgent(status, 'due-soon');
    }
  }

  return status;
}

/**
 * Whether the current user may edit, complete or delete a reminder: its creator, the vehicle
 * owner, or a user with `write` permission on the vehicle (same rule as canWriteRow / RLS).
 */
export function canWriteReminder(
  reminder: Pick<Reminder, 'user_id'>,
  vehicle: Pick<Vehicle, 'owner_id' | 'permission_level'> | null,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  if (reminder.user_id === userId) return true;
  return canWriteVehicle(vehicle, userId);
}

/**
 * Estimate a due date for a km-based reminder using fill history (km/month average).
 * Returns null if not enough data.
 */
export function estimateDueDate(
  reminder: Reminder,
  vehicleOdometer: number | null,
  fillExpenses: Expense[],
): Date | null {
  if (reminder.due_odometer === null || vehicleOdometer === null) return null;

  const remainingKm = reminder.due_odometer - vehicleOdometer;

  // Already overdue by odometer — return now
  if (remainingKm <= 0) return new Date();

  // Get fills for this vehicle, sorted by date
  const vehicleFills = fillExpenses
    .filter(
      (e) =>
        e.vehicle_id === reminder.vehicle_id &&
        (e.type === 'fuel' || e.type === 'electric_charge') &&
        e.odometer != null,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (vehicleFills.length < 2) return null;

  const first = vehicleFills[0];
  const last = vehicleFills[vehicleFills.length - 1];

  const kmDriven = (last.odometer as number) - (first.odometer as number);
  const msElapsed = new Date(last.date).getTime() - new Date(first.date).getTime();
  const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30.44);

  if (kmDriven <= 0 || monthsElapsed <= 0) return null;

  const kmPerMonth = kmDriven / monthsElapsed;
  const monthsUntilDue = remainingKm / kmPerMonth;

  const estimatedDate = new Date();
  estimatedDate.setTime(estimatedDate.getTime() + monthsUntilDue * 30.44 * 24 * 60 * 60 * 1000);

  return estimatedDate;
}

/**
 * Compute remaining km until a reminder triggers.
 */
export function getRemainingKm(reminder: Reminder, vehicleOdometer: number | null): number | null {
  if (reminder.due_odometer === null || vehicleOdometer === null) return null;
  return reminder.due_odometer - vehicleOdometer;
}

/**
 * Enrich a reminder with its computed status and estimated due date.
 */
export function enrichReminder(
  reminder: Reminder,
  vehicle: Vehicle | null,
  fillExpenses: Expense[],
): ReminderWithStatus {
  const odometer = vehicle?.odometer ?? null;
  const status = getReminderStatus(reminder, odometer);

  let computedEstimatedDate: Date | null = null;

  // If only km-based and no due_date, compute estimate from usage
  if (reminder.due_odometer !== null && reminder.due_date === null) {
    computedEstimatedDate = estimateDueDate(reminder, odometer, fillExpenses);
  }

  const remainingKm = getRemainingKm(reminder, odometer);

  return {
    ...reminder,
    status,
    computedEstimatedDate,
    remainingKm,
  };
}

/**
 * Format a reminder's due information for display.
 * Returns a human-readable string like "dans 1200 km (~mars 2026)" or "le 15 avril 2026".
 */
export function formatReminderDue(reminder: ReminderWithStatus): string {
  const parts: string[] = [];

  // Date part
  const displayDate = reminder.due_date
    ? new Date(reminder.due_date)
    : reminder.computedEstimatedDate;

  if (displayDate) {
    const dateStr = displayDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (reminder.due_date) {
      parts.push(`le ${dateStr}`);
    } else {
      parts.push(`~${dateStr}`);
    }
  }

  // Odometer part
  if (reminder.remainingKm !== null) {
    if (reminder.remainingKm <= 0) {
      parts.push('dépassé');
    } else {
      const kmStr = `dans ${reminder.remainingKm.toLocaleString('fr-FR')} km`;
      parts.push(kmStr);
    }
  }

  return parts.join(' · ') || '—';
}

/**
 * Sort reminders: overdue first, then due-soon, then upcoming.
 * Within each group, sort by due_date asc (nulls last).
 */
export function sortReminders(reminders: ReminderWithStatus[]): ReminderWithStatus[] {
  return [...reminders].sort((a, b) => {
    const orderDiff = STATUS_URGENCY[a.status] - STATUS_URGENCY[b.status];
    if (orderDiff !== 0) return orderDiff;

    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return dateA - dateB;
  });
}

/**
 * Filter reminders to only the active (non-completed) ones.
 */
export function getActiveReminders(reminders: ReminderWithStatus[]): ReminderWithStatus[] {
  return reminders.filter((r) => !r.is_completed);
}
