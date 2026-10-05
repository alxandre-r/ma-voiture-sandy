import { useState, useEffect, useCallback } from 'react';

import { getLocalToday } from '@/lib/utils/isoDate';
import { MAINTENANCE_TYPES } from '@/types/maintenance';

import type { MaintenanceFormData } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import type { Expense } from '@/types/expense';
import type { VehicleMinimal } from '@/types/vehicle';

/**
 * The type code to preselect. The view already gives the code (`maintenance_type`); the label
 * is only a fallback. An edited maintenance without a known type falls back to 'other', never
 * to 'repair' (which silently retyped it on save). New maintenances default to 'repair'.
 */
function resolveMaintenanceTypeCode(expense: Expense | null | undefined): string {
  if (!expense) return 'repair';
  const known = (code: string | null | undefined) =>
    MAINTENANCE_TYPES.some((t) => t.value === code) ? code! : null;
  return (
    known(expense.maintenance_type) ??
    MAINTENANCE_TYPES.find((t) => t.label === expense.maintenance_type_label)?.value ??
    'other'
  );
}

function buildInitialFormData(
  initialExpense: Expense | null | undefined,
  vehicles: VehicleMinimal[],
): MaintenanceFormData {
  return {
    vehicle_id: initialExpense?.vehicle_id ?? (vehicles.length === 1 ? vehicles[0].vehicle_id : 0),
    date: initialExpense?.date ?? getLocalToday(),
    amount: initialExpense?.amount ?? 0,
    notes: initialExpense?.notes ?? '',
    maintenance_type: resolveMaintenanceTypeCode(initialExpense),
    odometer: initialExpense?.odometer ?? 0,
    garage: initialExpense?.garage ?? '',
  };
}

export function useMaintenanceForm(vehicles: VehicleMinimal[], initialExpense?: Expense | null) {
  const [formData, setFormData] = useState<MaintenanceFormData>(() =>
    buildInitialFormData(initialExpense, vehicles),
  );

  // Sync odometer when vehicle changes (création uniquement)
  const isEdit = Boolean(initialExpense);
  useEffect(() => {
    if (isEdit || !formData.vehicle_id) return;
    const vehicle = vehicles.find((v) => v.vehicle_id === formData.vehicle_id);
    if (vehicle?.odometer != null) {
      setFormData((prev) => ({ ...prev, odometer: vehicle.odometer! }));
    }
  }, [isEdit, formData.vehicle_id, vehicles]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      setFormData((prev) => ({
        ...prev,
        // <select> values are strings: keep vehicle_id a number so `===` lookups match
        [name]: type === 'number' || name === 'vehicle_id' ? (value ? Number(value) : 0) : value,
      }));
    },
    [],
  );

  return { formData, handleChange };
}
