import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { calculateFillValues, useFillActions } from '@/hooks/fill/useFillActions';

import type { FillFormData } from '@/types/fill';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const validFill: FillFormData = {
  vehicle_id: 1,
  date: '2023-01-01',
  odometer: 10000,
  liters: 50,
  amount: 75,
  price_per_liter: 1.5,
  notes: 'Valid fill',
};

describe('useFillActions hook', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useFillActions(), { wrapper });
    expect(result.current.adding).toBe(false);
  });

  it('validates fill and charge data', () => {
    const { result } = renderHook(() => useFillActions(), { wrapper });
    const { validateFillData } = result.current;

    expect(validateFillData(validFill)).toBe(true);
    expect(validateFillData({ ...validFill, vehicle_id: 0 })).toBe(false);
    expect(validateFillData({ ...validFill, amount: 0 })).toBe(false);
    expect(validateFillData({ ...validFill, liters: 0, price_per_liter: 0 })).toBe(false);
    expect(
      validateFillData({ ...validFill, charge_type: 'charge', kwh: 0, price_per_kwh: 0 }),
    ).toBe(false);
    expect(validateFillData({ ...validFill, charge_type: 'charge', kwh: 40 })).toBe(true);
  });
});

describe('calculateFillValues', () => {
  it('derives liters from amount and price per liter', () => {
    expect(calculateFillValues({ amount: 75, price_per_liter: 1.5 }).liters).toBe(50);
  });

  it('derives kWh for a charge, and never derives the price from the quantity', () => {
    const result = calculateFillValues({ amount: 10, price_per_kwh: 0.25, charge_type: 'charge' });
    expect(result.kwh).toBe(40);
    expect(calculateFillValues({ amount: 75, liters: 50 }).price_per_liter).toBe(0);
  });

  it('takes identity fields from the base but never numeric ones', () => {
    const result = calculateFillValues({ amount: null }, validFill);
    expect(result.vehicle_id).toBe(1);
    expect(result.amount).toBe(0);
  });
});
