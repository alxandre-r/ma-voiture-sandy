/**
 * @file lib/demo/tour/reducer.ts
 * @description Pure state machine of the guided tour, plus restoration of the stored progress.
 * Commands that do not apply return the same state object (no re-render, no storage write).
 */

import type { TourCommand, TourState, TourStatus, TourStep } from './types';

export const TOUR_STATUSES: readonly TourStatus[] = [
  'welcome',
  'running',
  'paused',
  'done',
  'dismissed',
];

type ChapterOnly = Pick<TourStep, 'chapter'>;

export function initialTourState(sessionId: string): TourState {
  return { status: 'welcome', stepIndex: 0, sessionId };
}

/** Pathname of a step route: '/garage?vehicleId=101' → '/garage' */
export function routePath(route: string): string {
  return route.split('?')[0];
}

function firstStepOf(steps: readonly ChapterOnly[], chapter: string): number {
  return steps.findIndex((step) => step.chapter === chapter);
}

export function tourReducer(
  state: TourState,
  command: TourCommand,
  steps: readonly ChapterOnly[],
): TourState {
  const lastIndex = steps.length - 1;

  switch (command.type) {
    case 'START': {
      const index = command.chapter ? firstStepOf(steps, command.chapter) : 0;
      return { ...state, status: 'running', stepIndex: Math.max(0, index) };
    }
    case 'NEXT':
      if (state.status !== 'running') return state;
      return state.stepIndex >= lastIndex
        ? { ...state, status: 'done' }
        : { ...state, stepIndex: state.stepIndex + 1 };
    case 'PREV':
      if (state.status !== 'running' || state.stepIndex === 0) return state;
      return { ...state, stepIndex: state.stepIndex - 1 };
    case 'SKIP_CHAPTER': {
      if (state.status !== 'running') return state;
      const chapter = steps[state.stepIndex]?.chapter;
      const nextIndex = steps.findIndex(
        (step, index) => index > state.stepIndex && step.chapter !== chapter,
      );
      return nextIndex === -1 ? { ...state, status: 'done' } : { ...state, stepIndex: nextIndex };
    }
    case 'GOTO_CHAPTER': {
      const index = firstStepOf(steps, command.chapter);
      if (index === -1) return state;
      return { ...state, status: 'running', stepIndex: index };
    }
    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'RESUME':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;
    case 'STOP':
      return state.status === 'dismissed' ? state : { ...state, status: 'dismissed' };
    case 'COMPLETE':
      return state.status === 'done' ? state : { ...state, status: 'done' };
  }
}

/**
 * Restores the stored progress. Anything unexpected (other demo session, corrupted JSON,
 * unknown status, step out of range) starts over on the welcome card.
 */
export function hydrateTourState(
  raw: string | null,
  sessionId: string,
  stepCount: number,
): TourState {
  const initial = initialTourState(sessionId);
  if (!raw) return initial;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initial;
  }
  if (!parsed || typeof parsed !== 'object') return initial;

  const { status, stepIndex, sessionId: storedSessionId } = parsed as Record<string, unknown>;
  if (storedSessionId !== sessionId) return initial;
  if (typeof status !== 'string' || !TOUR_STATUSES.includes(status as TourStatus)) return initial;
  if (
    typeof stepIndex !== 'number' ||
    !Number.isInteger(stepIndex) ||
    stepIndex < 0 ||
    stepIndex >= stepCount
  ) {
    return initial;
  }
  return { status: status as TourStatus, stepIndex, sessionId };
}
