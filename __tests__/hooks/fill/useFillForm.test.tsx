import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { useFillForm } from '@/hooks/fill/useFillForm';

import type { VehicleMinimal } from '@/types/vehicle';
import type { ChangeEvent, ReactNode } from 'react';

const vehicle = (vehicle_id: number, fuel_type: string): VehicleMinimal => ({
  vehicle_id,
  name: `V${vehicle_id}`,
  make: '',
  model: '',
  fuel_type,
  odometer: 1000,
  status: 'active',
  owner_id: 'u1',
  permission_level: null,
});

// Stable arrays: a parent passes the same vehicles prop between renders
const phev = [vehicle(1, 'Hybride rechargeable')];
const twoChargeable = [vehicle(1, 'Électrique'), vehicle(2, 'Hybride rechargeable')];
const ev = [vehicle(1, 'electric')];

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const change = (name: string, value: string) =>
  ({ target: { name, value, type: 'number' } }) as unknown as ChangeEvent<HTMLInputElement>;

describe('useFillForm — forcedType (E1)', () => {
  it('uses the charge type chosen in the menu for a plug-in hybrid', () => {
    const { result } = renderHook(() => useFillForm(phev, null, undefined, 'charge'), { wrapper });
    expect(result.current.formData.charge_type).toBe('charge');
    expect(result.current.isElectric).toBe(true);
  });

  it('keeps the forced charge type with several vehicles and none selected yet', () => {
    const { result } = renderHook(() => useFillForm(twoChargeable, null, undefined, 'charge'), {
      wrapper,
    });
    expect(result.current.formData.vehicle_id).toBe(0);
    expect(result.current.formData.charge_type).toBe('charge');
  });

  it('computes kWh from amount and price per kWh for a forced charge', () => {
    const { result } = renderHook(() => useFillForm(phev, null, undefined, 'charge'), { wrapper });
    act(() => result.current.handleChange(change('amount', '10')));
    act(() => result.current.handleChange(change('price_per_kwh', '0.25')));
    expect(result.current.formData.kwh).toBe(40);
  });

  it('defaults a pure EV to a charge without a forced type', () => {
    const { result } = renderHook(() => useFillForm(ev), { wrapper });
    expect(result.current.formData.charge_type).toBe('charge');
  });
});

describe('useFillForm — odometer (E8)', () => {
  it('does not pre-fill the odometer, and exposes the current one as a hint', () => {
    const { result } = renderHook(() => useFillForm(ev), { wrapper });
    expect(result.current.formData.odometer).toBe(0);
    expect(result.current.currentOdometer).toBe(1000);
  });
});

describe('useFillForm — vehicle select (B18)', () => {
  it('stores vehicle_id as a number, so the energy of the chosen vehicle is found', () => {
    const vehicles = [vehicle(1, 'gasoline'), vehicle(2, 'electric')];
    const { result } = renderHook(() => useFillForm(vehicles, null), { wrapper });
    act(() => {
      result.current.handleChange({
        target: { name: 'vehicle_id', value: '2', type: 'select-one' },
      } as unknown as ChangeEvent<HTMLSelectElement>);
    });
    expect(result.current.formData.vehicle_id).toBe(2);
    expect(result.current.isElectric).toBe(true);
  });
});
