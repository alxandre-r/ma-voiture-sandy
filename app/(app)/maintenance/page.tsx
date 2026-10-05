/**
 * @file app/(app)/maintenance/page.tsx
 * @fileoverview SSR page for maintenance. Fetches vehicles first (vehicleIds
 * are required to query expenses), then fetches maintenance expenses.
 * loading.tsx handles the navigation skeleton.
 */

import { redirect } from 'next/navigation';

import { getMaintenanceExpenses } from '@/lib/data/maintenance/getMaintenanceExpenses';
import { getMaintenanceTypes } from '@/lib/data/maintenance/getMaintenanceTypes';
import { getAllVehicles } from '@/lib/data/vehicles';

import MaintenanceClient from './MaintenanceClient';

export default async function MaintenancePage() {
  const vehicles = await getAllVehicles();

  if (vehicles.length === 0) {
    redirect('/garage');
  }

  const vehicleIds = vehicles.map((v) => v.vehicle_id).filter((id) => id > 0);
  const [expenses, maintenanceTypes] = await Promise.all([
    getMaintenanceExpenses(vehicleIds),
    getMaintenanceTypes(),
  ]);

  return (
    <main>
      <MaintenanceClient
        vehicles={vehicles}
        initialExpenses={expenses}
        maintenanceTypes={maintenanceTypes}
      />
    </main>
  );
}
