'use client';

/**
 * @file components/tour/TourProvider.tsx
 * @description Generic guided-tour engine (renders no UI). It handles:
 * - state and persistence: the tour state (pure reducer), stored in localStorage and read only
 *   on the client, so there is no hydration mismatch;
 * - navigation: it opens each step's page, and pauses when the visitor navigates elsewhere;
 * - interaction: step enter/exit actions and keyboard shortcuts.
 */

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { hydrateTourState, routePath, tourReducer } from '@/lib/demo/tour/reducer';

import { isEditableTarget, isInteractiveTarget, runTourAction } from './dom';

import type {
  TourChapter,
  TourCommand,
  TourState,
  TourStatus,
  TourStep,
} from '@/lib/demo/tour/types';
import type { ReactNode } from 'react';

export interface TourContextValue {
  /** null until the stored progress has been read (first client effect) */
  status: TourStatus | null;
  stepIndex: number;
  /** Current step (also while paused or done) */
  step: TourStep | null;
  steps: readonly TourStep[];
  chapters: readonly TourChapter[];
  /** Running, but not yet on the current step's page */
  isNavigating: boolean;
  start: (chapter?: string) => void;
  next: () => void;
  prev: () => void;
  skipChapter: () => void;
  goToChapter: (chapter: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Tour controls, or null outside a TourProvider (e.g. outside the demo). */
export function useTour(): TourContextValue | null {
  return useContext(TourContext);
}

interface TourProviderProps {
  steps: readonly TourStep[];
  chapters: readonly TourChapter[];
  /** The stored progress is discarded when it belongs to another session */
  sessionId: string;
  storageKey: string;
  /** Called when the visitor quits a running or paused tour */
  onStop?: () => void;
  children: ReactNode;
}

export function TourProvider({
  steps,
  chapters,
  sessionId,
  storageKey,
  onStop,
  children,
}: TourProviderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [state, setState] = useState<TourState | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  // ── Persistence ──
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch {
      // Storage unavailable (private mode): start over
    }
    setState(hydrateTourState(raw, sessionId, steps.length));
  }, [storageKey, sessionId, steps.length]);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage unavailable: the tour still works for this page view
    }
  }, [state, storageKey]);

  const dispatch = useCallback(
    (command: TourCommand) =>
      setState((current) => (current ? tourReducer(current, command, steps) : current)),
    [steps],
  );

  const step = state ? (steps[state.stepIndex] ?? null) : null;
  const isRunning = state?.status === 'running';
  const isNavigating = isRunning && step !== null && pathname !== routePath(step.route);

  // ── Navigation: open the step's page once per step activation ──
  const navigatedStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state || state.status !== 'running' || !step) {
      navigatedStepRef.current = null; // a resume navigates again
      return;
    }
    if (navigatedStepRef.current === state.stepIndex) return;
    navigatedStepRef.current = state.stepIndex;
    // A query route is pushed even on the same page: the page reads its query only once
    if (pathname !== routePath(step.route) || step.route.includes('?')) router.push(step.route);
  }, [state, step, pathname, router]);

  // ── Manual navigation: any other pathname than the current step's pauses the tour ──
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    const current = stateRef.current;
    if (current?.status !== 'running') return;
    const currentStep = steps[current.stepIndex];
    if (currentStep && pathname !== routePath(currentStep.route)) dispatch({ type: 'PAUSE' });
  }, [pathname, steps, dispatch]);

  // ── Step actions ──
  // Declared before the onEnter effect: effects run in order, so the previous step's exit
  // action always starts before the next step's enter action
  const activeStepRef = useRef<TourStep | null>(null);
  useEffect(() => {
    const active = isRunning ? step : null;
    const previous = activeStepRef.current;
    activeStepRef.current = active;
    if (previous && previous !== active && previous.onExit) void runTourAction(previous.onExit);
  }, [isRunning, step]);

  useEffect(() => {
    if (!isRunning || isNavigating || !step?.onEnter) return;
    // Aborted on cleanup: React StrictMode's double effect never clicks twice
    const controller = new AbortController();
    void runTourAction(step.onEnter, { signal: controller.signal });
    return () => controller.abort();
  }, [isRunning, isNavigating, step]);

  // ── Commands ──
  const start = useCallback((chapter?: string) => dispatch({ type: 'START', chapter }), [dispatch]);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), [dispatch]);
  const skipChapter = useCallback(() => dispatch({ type: 'SKIP_CHAPTER' }), [dispatch]);
  const goToChapter = useCallback(
    (chapter: string) => dispatch({ type: 'GOTO_CHAPTER', chapter }),
    [dispatch],
  );
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), [dispatch]);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), [dispatch]);
  const stop = useCallback(() => {
    const status = stateRef.current?.status;
    dispatch({ type: 'STOP' });
    if (status === 'running' || status === 'paused') onStopRef.current?.();
  }, [dispatch]);

  // ── Keyboard: → / Enter next, ← previous, Escape quit ──
  useEffect(() => {
    if (!isRunning) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isNavigating && event.key !== 'Escape') return;
      if (isEditableTarget(event.target)) return;
      if (
        event.key === 'ArrowRight' ||
        (event.key === 'Enter' && !isInteractiveTarget(event.target))
      ) {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      } else if (event.key === 'Escape') {
        stop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, isNavigating, next, prev, stop]);

  const value = useMemo<TourContextValue>(
    () => ({
      status: state?.status ?? null,
      stepIndex: state?.stepIndex ?? 0,
      step,
      steps,
      chapters,
      isNavigating,
      start,
      next,
      prev,
      skipChapter,
      goToChapter,
      pause,
      resume,
      stop,
    }),
    [
      state,
      step,
      steps,
      chapters,
      isNavigating,
      start,
      next,
      prev,
      skipChapter,
      goToChapter,
      pause,
      resume,
      stop,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
