import type { Attachment } from '@/types/attachment';

export type ReminderType = 'maintenance' | 'insurance' | 'inspection' | 'custom';

export type ReminderStatus = 'overdue' | 'due-soon' | 'upcoming' | 'none';

export type RecurrenceType = 'km' | 'time';

export interface Reminder {
  id: number;
  user_id: string;
  vehicle_id: number | null;
  type: ReminderType;
  title: string;
  description: string | null;
  due_date: string | null;
  due_odometer: number | null;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_value: number | null;
  last_triggered_at: string | null;
  is_completed: boolean;
  maintenance_type_id: string | null;
  estimated_due_date: string | null;
  created_at: string;
  /** The maintenance an automatic reminder was computed from; deleting it deletes the reminder. */
  source_expense_id?: number | null;
  /** Embedded by getReminders (FK reminders_source_expense_id_fkey); null if not visible. */
  source_expense?: { id: number; date: string } | null;
  attachments?: Attachment[];
}

export interface ReminderWithStatus extends Reminder {
  status: ReminderStatus;
  computedEstimatedDate: Date | null;
  remainingKm: number | null;
}

export interface ReminderFormData {
  vehicle_id: number | null;
  type: ReminderType;
  title: string;
  description?: string;
  due_date?: string;
  due_odometer?: number;
  is_recurring: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_value?: number;
}
