import { getFillExpenses } from '@/lib/data/expenses';
import { getReminders } from '@/lib/data/reminders';
import { getAllVehicles } from '@/lib/data/vehicles';

import RemindersClient from './RemindersClient';

export default async function RemindersPage() {
  const vehicles = await getAllVehicles();
  const vehicleIds = vehicles.map((v) => v.vehicle_id).filter((id) => id > 0);

  const [reminders, fillExpenses] = await Promise.all([
    getReminders(vehicleIds),
    getFillExpenses(vehicleIds),
  ]);

  return (
    <main>
      <RemindersClient reminders={reminders} vehicles={vehicles} fillExpenses={fillExpenses} />
    </main>
  );
}
