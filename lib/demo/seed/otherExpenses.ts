import { DEMO_DAUGHTER_ID, DEMO_PARTNER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '../constants';
import { addDays, toTimestamp } from '../dates';

import type { DemoExpense } from '../types';

const { peugeot308, zoe, niro, peugeot208 } = DEMO_VEHICLE;

const OTHER: Array<{
  vehicleId: number;
  owner: string;
  daysAgo: number;
  label: string;
  amount: number;
  notes?: string;
}> = [
  { vehicleId: peugeot308, owner: DEMO_USER_ID, daysAgo: 12, label: 'Lavage', amount: 14.5 },
  {
    vehicleId: peugeot308,
    owner: DEMO_USER_ID,
    daysAgo: 38,
    label: 'Péage A7',
    amount: 31.8,
    notes: 'Vacances dans le Sud',
  },
  {
    vehicleId: peugeot308,
    owner: DEMO_USER_ID,
    daysAgo: 39,
    label: 'Péage A7',
    amount: 29.6,
    notes: 'Retour de vacances',
  },
  {
    vehicleId: peugeot308,
    owner: DEMO_USER_ID,
    daysAgo: 96,
    label: 'Parking aéroport',
    amount: 64,
    notes: 'Week-end à Porto',
  },
  { vehicleId: peugeot308, owner: DEMO_USER_ID, daysAgo: 130, label: 'Lavage', amount: 12 },
  { vehicleId: peugeot308, owner: DEMO_USER_ID, daysAgo: 210, label: 'Péage A6', amount: 18.4 },
  { vehicleId: peugeot308, owner: DEMO_USER_ID, daysAgo: 260, label: 'Lavage', amount: 15 },
  {
    vehicleId: peugeot308,
    owner: DEMO_USER_ID,
    daysAgo: 395,
    label: 'Péage A7',
    amount: 30.9,
    notes: 'Vacances dans le Sud',
  },
  { vehicleId: peugeot308, owner: DEMO_USER_ID, daysAgo: 402, label: 'Péage A7', amount: 31.8 },
  {
    vehicleId: peugeot308,
    owner: DEMO_USER_ID,
    daysAgo: 590,
    label: "Vignette Crit'Air",
    amount: 3.72,
  },
  { vehicleId: zoe, owner: DEMO_USER_ID, daysAgo: 20, label: 'Parking centre-ville', amount: 7.5 },
  {
    vehicleId: zoe,
    owner: DEMO_USER_ID,
    daysAgo: 75,
    label: 'Abonnement réseau de recharge',
    amount: 4.99,
  },
  { vehicleId: zoe, owner: DEMO_USER_ID, daysAgo: 160, label: 'Parking centre-ville', amount: 9 },
  {
    vehicleId: zoe,
    owner: DEMO_USER_ID,
    daysAgo: 540,
    label: 'Câble de recharge Type 2',
    amount: 189,
  },
  {
    vehicleId: niro,
    owner: DEMO_PARTNER_ID,
    daysAgo: 44,
    label: 'Péage A43',
    amount: 22.3,
    notes: 'Week-end à la montagne',
  },
  { vehicleId: niro, owner: DEMO_PARTNER_ID, daysAgo: 150, label: 'Lavage', amount: 16 },
  { vehicleId: niro, owner: DEMO_PARTNER_ID, daysAgo: 330, label: 'Chaînes neige', amount: 79.9 },
  {
    vehicleId: peugeot208,
    owner: DEMO_DAUGHTER_ID,
    daysAgo: 27,
    label: 'Parking université',
    amount: 25,
    notes: 'Abonnement mensuel',
  },
  {
    vehicleId: peugeot208,
    owner: DEMO_DAUGHTER_ID,
    daysAgo: 58,
    label: 'Parking université',
    amount: 25,
    notes: 'Abonnement mensuel',
  },
  { vehicleId: peugeot208, owner: DEMO_DAUGHTER_ID, daysAgo: 300, label: 'Lavage', amount: 9 },
];

export function seedOtherExpenses(today: string): DemoExpense[] {
  return OTHER.map((entry, i) => {
    const date = addDays(today, -entry.daysAgo);
    return {
      id: 70_000 + i,
      vehicle_id: entry.vehicleId,
      owner_id: entry.owner,
      type: 'other',
      amount: entry.amount,
      date,
      notes: entry.notes ?? null,
      created_at: toTimestamp(date, '12:00:00'),
      label: entry.label,
    };
  });
}
