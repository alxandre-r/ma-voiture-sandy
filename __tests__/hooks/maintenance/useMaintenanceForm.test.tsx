import { act, renderHook } from '@testing-library/react';

import { useMaintenanceForm } from '@/app/(app)/maintenance/hooks/useMaintenanceForm';

import type { Expense } from '@/types/expense';
import type { VehicleMinimal } from '@/types/vehicle';
import type { ChangeEvent } from 'react';

const vehicles = [
  { vehicle_id: 1, name: 'A', odometer: 1000 },
  { vehicle_id: 2, name: 'B', odometer: 52000 },
] as VehicleMinimal[];

const expense = (fields: Partial<Expense>) =>
  ({ id: 9, vehicle_id: 1, date: '2026-01-10', amount: 80, ...fields }) as Expense;

describe('useMaintenanceForm', () => {
  it('preselects the type from its code (B21)', () => {
    const { result } = renderHook(() =>
      useMaintenanceForm(
        vehicles,
        expense({ maintenance_type: 'brakes', maintenance_type_label: 'Libellé renommé' }),
      ),
    );
    expect(result.current.formData.maintenance_type).toBe('brakes');
  });

  it("falls back to 'other', not 'repair', for an edited maintenance without a type", () => {
    const { result } = renderHook(() =>
      useMaintenanceForm(
        vehicles,
        expense({ maintenance_type: null, maintenance_type_label: null }),
      ),
    );
    expect(result.current.formData.maintenance_type).toBe('other');
  });

  it("defaults a new maintenance to 'repair'", () => {
    const { result } = renderHook(() => useMaintenanceForm(vehicles));
    expect(result.current.formData.maintenance_type).toBe('repair');
  });

  it('stores the selected vehicle as a number and prefills its odometer (B18)', () => {
    const { result } = renderHook(() => useMaintenanceForm(vehicles));
    act(() => {
      result.current.handleChange({
        target: { name: 'vehicle_id', value: '2', type: 'select-one' },
      } as ChangeEvent<HTMLSelectElement>);
    });
    expect(result.current.formData.vehicle_id).toBe(2);
    expect(result.current.formData.odometer).toBe(52000);
  });
});
