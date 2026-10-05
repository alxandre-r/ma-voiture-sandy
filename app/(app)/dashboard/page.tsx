// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import React from 'react';

import { getAllExpenses } from '@/lib/data/expenses';
import { getInsuranceData } from '@/lib/data/insurance/getInsuranceData';
import { getReminders } from '@/lib/data/reminders';
import { getAllVehicles } from '@/lib/data/vehicles';

import DashboardClient from './DashboardClient';

import type { Expense } from '@/types/expense';
import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

export default async function DashboardPage() {
  const vehicles = (await getAllVehicles()) as Vehicle[];
  if (!vehicles || vehicles.length === 0) redirect('/dashboard/landing'); // If user has no vehicles, redirect to landing page to encourage them to add one

  const vehicleIds = vehicles.map((v) => v.vehicle_id).filter((id) => id > 0);

  const [expenses, reminders, insurance] = await Promise.all([
    getAllExpenses(vehicleIds) as Promise<Expense[]>,
    getReminders(vehicleIds) as Promise<Reminder[]>,
    getInsuranceData(vehicles),
  ]);

  // Fill expenses for smart prediction in widget
  const fillExpenses = expenses.filter((e) => e.type === 'fuel' || e.type === 'electric_charge');

  return (
    <main>
      <DashboardClient
        vehicles={vehicles}
        expenses={expenses}
        reminders={reminders}
        fillExpenses={fillExpenses}
        insurance={insurance}
      />
    </main>
  );
}
