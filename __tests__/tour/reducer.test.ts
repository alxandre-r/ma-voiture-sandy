import { describe, expect, it } from 'vitest';

import {
  hydrateTourState,
  initialTourState,
  routePath,
  tourReducer,
} from '@/lib/demo/tour/reducer';

import type { TourCommand, TourState } from '@/lib/demo/tour/types';

const STEPS = [{ chapter: 'a' }, { chapter: 'a' }, { chapter: 'b' }, { chapter: 'c' }];
const at = (stepIndex: number, status: TourState['status'] = 'running'): TourState => ({
  status,
  stepIndex,
  sessionId: 's1',
});
const reduce = (state: TourState, command: TourCommand) => tourReducer(state, command, STEPS);

describe('tourReducer', () => {
  it('starts on the first step, or on the first step of a chapter', () => {
    const welcome = initialTourState('s1');
    expect(reduce(welcome, { type: 'START' })).toEqual(at(0));
    expect(reduce(welcome, { type: 'START', chapter: 'b' })).toEqual(at(2));
    expect(reduce(welcome, { type: 'START', chapter: 'nope' })).toEqual(at(0));
    expect(reduce(at(3, 'done'), { type: 'START' })).toEqual(at(0));
  });

  it('moves forward and completes after the last step', () => {
    expect(reduce(at(0), { type: 'NEXT' })).toEqual(at(1));
    expect(reduce(at(3), { type: 'NEXT' })).toEqual(at(3, 'done'));
  });

  it('does nothing on PREV at the first step', () => {
    const first = at(0);
    expect(reduce(first, { type: 'PREV' })).toBe(first);
  });

  it('moves back', () => {
    expect(reduce(at(2), { type: 'PREV' })).toEqual(at(1));
  });

  it('skips to the next chapter, or completes from the last one', () => {
    expect(reduce(at(0), { type: 'SKIP_CHAPTER' })).toEqual(at(2));
    expect(reduce(at(1), { type: 'SKIP_CHAPTER' })).toEqual(at(2));
    expect(reduce(at(3), { type: 'SKIP_CHAPTER' })).toEqual(at(3, 'done'));
  });

  it('jumps to a chapter (also from a pause) and ignores unknown chapters', () => {
    expect(reduce(at(0), { type: 'GOTO_CHAPTER', chapter: 'c' })).toEqual(at(3));
    expect(reduce(at(1, 'paused'), { type: 'GOTO_CHAPTER', chapter: 'b' })).toEqual(at(2));
    const state = at(1);
    expect(reduce(state, { type: 'GOTO_CHAPTER', chapter: 'nope' })).toBe(state);
  });

  it('pauses and resumes only from the matching status', () => {
    expect(reduce(at(1), { type: 'PAUSE' })).toEqual(at(1, 'paused'));
    expect(reduce(at(1, 'paused'), { type: 'RESUME' })).toEqual(at(1));
    const welcome = initialTourState('s1');
    expect(reduce(welcome, { type: 'PAUSE' })).toBe(welcome);
    const running = at(1);
    expect(reduce(running, { type: 'RESUME' })).toBe(running);
  });

  it('ignores step navigation while paused', () => {
    const paused = at(1, 'paused');
    expect(reduce(paused, { type: 'NEXT' })).toBe(paused);
    expect(reduce(paused, { type: 'PREV' })).toBe(paused);
    expect(reduce(paused, { type: 'SKIP_CHAPTER' })).toBe(paused);
  });

  it('stops and completes from any status, keeping the step', () => {
    expect(reduce(at(2), { type: 'STOP' })).toEqual(at(2, 'dismissed'));
    expect(reduce(at(2, 'paused'), { type: 'STOP' })).toEqual(at(2, 'dismissed'));
    expect(reduce(at(2), { type: 'COMPLETE' })).toEqual(at(2, 'done'));
  });
});

describe('hydrateTourState', () => {
  it('starts on the welcome card without stored progress', () => {
    expect(hydrateTourState(null, 's1', 4)).toEqual(initialTourState('s1'));
  });

  it('restores the progress of the same demo session', () => {
    const raw = JSON.stringify(at(2, 'paused'));
    expect(hydrateTourState(raw, 's1', 4)).toEqual(at(2, 'paused'));
  });

  it('restarts on the welcome card for a new demo session', () => {
    const raw = JSON.stringify({ ...at(2), sessionId: 'old-session' });
    expect(hydrateTourState(raw, 's1', 4)).toEqual(initialTourState('s1'));
  });

  it('ignores corrupted or out-of-range data', () => {
    const welcome = initialTourState('s1');
    expect(hydrateTourState('{oops', 's1', 4)).toEqual(welcome);
    expect(hydrateTourState('42', 's1', 4)).toEqual(welcome);
    expect(hydrateTourState(JSON.stringify(at(9)), 's1', 4)).toEqual(welcome);
    expect(hydrateTourState(JSON.stringify(at(-1)), 's1', 4)).toEqual(welcome);
    expect(hydrateTourState(JSON.stringify({ ...at(1), status: 'flying' }), 's1', 4)).toEqual(
      welcome,
    );
  });
});

describe('routePath', () => {
  it('drops the query string', () => {
    expect(routePath('/garage?vehicleId=101')).toBe('/garage');
    expect(routePath('/statistics')).toBe('/statistics');
  });
});
