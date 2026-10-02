import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTargetRect } from '@/components/tour/useTargetRect';

function anchor(id: string) {
  const el = document.createElement('div');
  el.dataset.tour = id;
  el.getBoundingClientRect = () =>
    ({
      top: 120,
      left: 40,
      width: 300,
      height: 80,
      x: 40,
      y: 120,
      right: 340,
      bottom: 200,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useTargetRect', () => {
  it('stays idle while disabled (navigation in progress)', () => {
    anchor('stats');
    const { result } = renderHook(() => useTargetRect('stats', { enabled: false }));
    expect(result.current).toEqual({ status: 'idle', rect: null });
  });

  it('reports "missing" right away for a step without target', () => {
    const { result } = renderHook(() => useTargetRect(undefined, { enabled: true }));
    expect(result.current).toEqual({ status: 'missing', rect: null });
  });

  it('finds and measures the visible target', async () => {
    anchor('stats');
    const { result } = renderHook(() => useTargetRect('stats', { enabled: true }));
    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.rect).toEqual({ top: 120, left: 40, width: 300, height: 80 });
  });

  it('falls back to "missing" (centered card) after the timeout', async () => {
    const { result } = renderHook(() => useTargetRect('absent', { enabled: true, timeoutMs: 50 }));
    expect(result.current.status).toBe('searching');
    await waitFor(() => expect(result.current.status).toBe('missing'));
  });
});
