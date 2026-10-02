'use client';

/**
 * @file components/tour/useTargetRect.ts
 * @description Waits for the visible copy of a tour anchor, scrolls it into view, then tracks
 * its rectangle on every animation frame (entry animations move it for ~500 ms). The state
 * only changes when the rectangle does. Also exports useViewport().
 */

import { useEffect, useState } from 'react';

import {
  TARGET_TIMEOUT_MS,
  isVisible,
  sameRect,
  scrollTargetIntoView,
  toRect,
  waitForTarget,
} from './dom';

import type { Rect, Size } from './placement';

export type TargetStatus = 'idle' | 'searching' | 'found' | 'missing';

export interface TargetState {
  status: TargetStatus;
  rect: Rect | null;
}

const IDLE: TargetState = { status: 'idle', rect: null };
const SEARCHING: TargetState = { status: 'searching', rect: null };
const MISSING: TargetState = { status: 'missing', rect: null };

export function useTargetRect(
  targetId: string | undefined,
  {
    enabled,
    timeoutMs = TARGET_TIMEOUT_MS,
    mobile = false,
  }: { enabled: boolean; timeoutMs?: number; mobile?: boolean },
): TargetState {
  const [state, setState] = useState<TargetState>(IDLE);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return;
    }
    if (!targetId) {
      setState(MISSING);
      return;
    }

    const controller = new AbortController();
    let frame = 0;

    function track(el: HTMLElement) {
      let last: Rect | null = null;
      const tick = () => {
        if (controller.signal.aborted) return;
        // Replaced by a re-render or hidden by a resize: look for it again
        if (!el.isConnected || !isVisible(el)) {
          void search();
          return;
        }
        const rect = toRect(el.getBoundingClientRect());
        if (!last || !sameRect(last, rect)) {
          last = rect;
          setState({ status: 'found', rect });
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
    }

    async function search() {
      setState(SEARCHING);
      const el = await waitForTarget(targetId as string, { timeoutMs, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!el) {
        setState(MISSING);
        return;
      }
      scrollTargetIntoView(el, { mobile });
      track(el);
    }

    void search();
    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
    };
  }, [targetId, enabled, timeoutMs, mobile]);

  return state;
}

/** Window size, updated on resize */
export function useViewport(): Size {
  const [viewport, setViewport] = useState<Size>(() =>
    typeof window === 'undefined'
      ? { width: 1024, height: 768 }
      : { width: window.innerWidth, height: window.innerHeight },
  );

  useEffect(() => {
    const update = () =>
      setViewport((prev) =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight },
      );
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}
