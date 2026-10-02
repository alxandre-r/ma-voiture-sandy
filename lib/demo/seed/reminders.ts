import { DEMO_DAUGHTER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '../constants';
import { addDays, addMonths, toTimestamp } from '../dates';

import type { DemoExpense } from '../types';
import type { Reminder } from '@/types/reminder';

const BASE = {
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
};

export function seedReminders(today: string, maintenance: DemoExpense[]): Reminder[] {
  const oilChange = maintenance.find(
    (e) =>
      e.vehicle_id === DEMO_VEHICLE.peugeot308 &&
      e.maintenance?.maintenance_type_id === 'oil_change',
  );
  const oilOdometer = oilChange?.maintenance?.odometer ?? 0;
  const oilCreatedAt = oilChange?.created_at ?? toTimestamp(addMonths(today, -8));

  return [
    {
      ...BASE,
      id: 701,
      user_id: DEMO_USER_ID,
      vehicle_id: DEMO_VEHICLE.peugeot308,
      type: 'inspection',
      title: 'Contrôle technique',
      description: 'Prendre rendez-vous au centre habituel',
      due_date: toTimestamp(addDays(today, 12)),
      is_recurring: true,
      recurrence_type: 'time',
      recurrence_value: 24,
      maintenance_type_id: 'inspection',
      created_at: toTimestamp(addDays(addMonths(today, -24), 12), '18:00:00'),
    },
    {
      ...BASE,
      id: 702,
      user_id: DEMO_USER_ID,
      vehicle_id: DEMO_VEHICLE.zoe,
      type: 'maintenance',
      title: 'Permutation des pneus',
      description: 'Avant et arrière, pour une usure homogène',
      due_date: toTimestamp(addDays(today, -6)),
      created_at: toTimestamp(addMonths(today, -3), '20:15:00'),
    },
    {
      ...BASE,
      id: 703,
      user_id: DEMO_USER_ID,
      vehicle_id: DEMO_VEHICLE.peugeot308,
      type: 'maintenance',
      title: 'Vidange',
      due_odometer: oilOdometer + 15_000,
      is_recurring: true,
      recurrence_type: 'km',
      recurrence_value: 15_000,
      last_triggered_at: oilCreatedAt,
      maintenance_type_id: 'oil_change',
      created_at: oilCreatedAt,
    },
    {
      ...BASE,
      id: 704,
      user_id: DEMO_USER_ID,
      vehicle_id: DEMO_VEHICLE.niro,
      type: 'maintenance',
      title: 'Révision annuelle',
      description: 'Révision Kia avec mise à jour logicielle',
      due_date: toTimestamp(addDays(today, 55)),
      is_recurring: true,
      recurrence_type: 'time',
      recurrence_value: 12,
      maintenance_type_id: 'revision',
      created_at: toTimestamp(addMonths(today, -10), '19:00:00'),
    },
    {
      ...BASE,
      id: 705,
      user_id: DEMO_USER_ID,
      vehicle_id: DEMO_VEHICLE.zoe,
      type: 'maintenance',
      title: "Balais d'essuie-glace",
      due_date: toTimestamp(addDays(today, -27)),
      last_triggered_at: toTimestamp(addDays(today, -25), '10:30:00'),
      is_completed: true,
      maintenance_type_id: 'wipers',
      created_at: toTimestamp(addMonths(today, -2), '09:00:00'),
    },
    {
      ...BASE,
      id: 706,
      user_id: DEMO_DAUGHTER_ID,
      vehicle_id: DEMO_VEHICLE.peugeot208,
      type: 'maintenance',
      title: 'Pneus avant à changer',
      description: "Témoin d'usure atteint",
      due_date: toTimestamp(addDays(today, -20)),
      maintenance_type_id: 'tires',
      created_at: toTimestamp(addMonths(today, -2), '21:40:00'),
    },
  ];
}
