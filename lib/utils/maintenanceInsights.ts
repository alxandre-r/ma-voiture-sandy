import { addMonthsIso } from '@/lib/utils/isoDate';

import type { MaintenanceTypeInfo } from '@/lib/data/maintenance/getMaintenanceTypes';
import type { Expense } from '@/types/expense';
import type { VehicleMinimal } from '@/types/vehicle';

export interface MaintenanceSuggestion {
  vehicleId: number;
  vehicleName: string;
  maintenanceTypeId: string;
  label: string;
  lastDoneDate: string | null;
  lastDoneOdometer: number | null;
  monthsOverdue: number | null;
  kmOverdue: number | null;
  suggestedDueDate: string | null;
  suggestedDueOdometer: number | null;
}

/**
 * Computes maintenance suggestions based on last occurrence and type intervals.
 * Only returns suggestions for types with non-null intervals and where
 * the next service is within 1 month or already overdue.
 */
export function computeMaintenanceSuggestions(
  expenses: Expense[],
  vehicles: VehicleMinimal[],
  maintenanceTypes: Record<string, MaintenanceTypeInfo>,
): MaintenanceSuggestion[] {
  const now = new Date();
  const suggestions: MaintenanceSuggestion[] = [];

  for (const vehicle of vehicles) {
    const vehicleName = vehicle.name || `${vehicle.make} ${vehicle.model}`;
    const vehicleExpenses = expenses.filter(
      (e) => e.vehicle_id === vehicle.vehicle_id && e.type === 'maintenance' && e.maintenance_type,
    );

    for (const [typeId, typeInfo] of Object.entries(maintenanceTypes)) {
      if (!typeInfo.interval_months && !typeInfo.interval_km) continue;

      const typeExpenses = vehicleExpenses
        .filter((e) => e.maintenance_type === typeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastExpense = typeExpenses[0] ?? null;

      let monthsOverdue: number | null = null;
      let kmOverdue: number | null = null;
      let suggestedDueDate: string | null = null;
      let suggestedDueOdometer: number | null = null;

      if (lastExpense) {
        if (typeInfo.interval_months) {
          // Calendar math on the YYYY-MM-DD string: Date + toISOString shifts a day west of UTC
          suggestedDueDate = addMonthsIso(lastExpense.date, typeInfo.interval_months);
          const dueDate = new Date(`${suggestedDueDate}T00:00:00`);
          monthsOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        }
        if (typeInfo.interval_km && lastExpense.odometer) {
          suggestedDueOdometer = lastExpense.odometer + typeInfo.interval_km;
          const currentOdometer = vehicle.odometer ?? lastExpense.odometer;
          kmOverdue = currentOdometer - suggestedDueOdometer;
        }
      } else {
        // Never done — treat as overdue by a full interval
        monthsOverdue = typeInfo.interval_months ? typeInfo.interval_months : null;
      }

      // Only surface if within 1 month of due date or already overdue
      const monthsDue = monthsOverdue !== null ? monthsOverdue : null;
      const isTimeDue = monthsDue !== null && monthsDue >= -1;
      const isKmDue = kmOverdue !== null && kmOverdue >= 0;

      if (isTimeDue || isKmDue) {
        suggestions.push({
          vehicleId: vehicle.vehicle_id,
          vehicleName,
          maintenanceTypeId: typeId,
          label: typeInfo.label_fr,
          lastDoneDate: lastExpense?.date ?? null,
          lastDoneOdometer: lastExpense?.odometer ?? null,
          monthsOverdue: monthsDue,
          kmOverdue,
          suggestedDueDate,
          suggestedDueOdometer,
        });
      }
    }
  }

  // Sort: most overdue first
  suggestions.sort((a, b) => (b.monthsOverdue ?? 0) - (a.monthsOverdue ?? 0));

  return suggestions;
}
