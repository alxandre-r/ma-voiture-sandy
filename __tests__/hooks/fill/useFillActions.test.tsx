// Test for the refactored useFillActions hook
import { renderHook, act } from '@testing-library/react';

import { useFillActions } from '@/hooks/fill/useFillActions';

import type { Fill, FillFormData } from '@/types/fill';

describe('useFillActions hook', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useFillActions());

    expect(result.current.editingId).toBeNull();
    expect(result.current.editData).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(result.current.adding).toBe(false);
    expect(result.current.deletingId).toBeNull();
    expect(result.current.showDeleteConfirm).toBe(false);
  });

  it('should handle field changes with auto-calculations', () => {
    const { result } = renderHook(() => useFillActions());

    // Start editing with some data
    const mockFill: Fill = {
      id: 1,
      vehicle_id: 1,
      date: '2023-01-01',
      odometer: 10000,
      liters: 50,
      amount: 75,
      price_per_liter: 1.5,
      notes: 'Test fill',
    };

    act(() => {
      result.current.startEdit(mockFill);
    });

    expect(result.current.editData).toEqual({
      vehicle_id: 1,
      date: '2023-01-01',
      odometer: 10000,
      liters: 50,
      amount: 75,
      price_per_liter: 1.5,
      notes: 'Test fill',
    });

    // Test auto-calculation when changing liters
    act(() => {
      result.current.handleFieldChange('liters', 60);
    });

    // Should auto-calculate price_per_liter = amount / liters = 75 / 60 = 1.25
    expect(result.current.editData?.price_per_liter).toBeCloseTo(1.25, 2);
  });

  it('should validate fill data correctly', () => {
    const { result } = renderHook(() => useFillActions());

    const invalidData: FillFormData = {
      vehicle_id: 0, // Invalid: should be > 0
      date: '', // Invalid: should not be empty
      odometer: 0,
      liters: 0,
      amount: 0, // Invalid: should not be 0
      price_per_liter: 0,
      notes: '',
    };

    const validData: FillFormData = {
      vehicle_id: 1,
      date: '2023-01-01',
      odometer: 10000,
      liters: 50,
      amount: 75,
      price_per_liter: 1.5,
      notes: 'Valid fill',
    };

    expect(result.current.validateFillData(invalidData)).toBe(false);
    expect(result.current.validateFillData(validData)).toBe(true);
  });

  it('should calculate fill values correctly', () => {
    const { result } = renderHook(() => useFillActions());

    const partialData: Partial<FillFormData> = {
      amount: 75,
      liters: 50,
    };

    const calculated = result.current.calculateFillValues(partialData);

    // Should auto-calculate price_per_liter = amount / liters = 75 / 50 = 1.5
    expect(calculated.price_per_liter).toBeCloseTo(1.5, 2);
  });
});
