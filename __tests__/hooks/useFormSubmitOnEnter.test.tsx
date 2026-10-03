/**
 * @file __tests__/hooks/useFormSubmitOnEnter.test.tsx
 * @description Unit tests for the useFormSubmitOnEnter hook
 */

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useFormSubmitOnEnter } from '@/hooks/useFormSubmitOnEnter';

describe('useFormSubmitOnEnter Hook', () => {
  it('should call onSubmit when Enter is pressed', () => {
    const mockOnSubmit = vi.fn();
    const mockRef = {
      current: document.createElement('input'),
    };

    renderHook(() => useFormSubmitOnEnter(mockRef, mockOnSubmit, false));

    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    mockRef.current.dispatchEvent(event);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should not call onSubmit when other keys are pressed', () => {
    const mockOnSubmit = vi.fn();
    const mockRef = {
      current: document.createElement('input'),
    };

    renderHook(() => useFormSubmitOnEnter(mockRef, mockOnSubmit, false));

    // Simulate Space key press
    const event = new KeyboardEvent('keydown', { key: ' ' });
    mockRef.current.dispatchEvent(event);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should not call onSubmit when disabled', () => {
    const mockOnSubmit = vi.fn();
    const mockRef = {
      current: document.createElement('input'),
    };

    renderHook(() => useFormSubmitOnEnter(mockRef, mockOnSubmit, true));

    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    mockRef.current.dispatchEvent(event);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should not throw error when ref is null', () => {
    const mockOnSubmit = vi.fn();
    const mockRef = {
      current: null,
    };

    expect(() => {
      renderHook(() => useFormSubmitOnEnter(mockRef, mockOnSubmit, false));
    }).not.toThrow();
  });

  it('should prevent default behavior on Enter', () => {
    const mockOnSubmit = vi.fn();
    const mockRef = {
      current: document.createElement('input'),
    };

    renderHook(() => useFormSubmitOnEnter(mockRef, mockOnSubmit, false));

    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    const spy = vi.spyOn(event, 'preventDefault');
    mockRef.current.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });
});
