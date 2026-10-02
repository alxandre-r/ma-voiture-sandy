/**
 * @file lib/demo/tour/types.ts
 * @description Types of the guided tour: scenario data (chapters, steps) and engine state.
 */

export type TourStatus = 'welcome' | 'running' | 'paused' | 'done' | 'dismissed';

export type TourPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/** Scripted interaction run when a step starts or ends */
export type TourAction =
  /** Clicks the visible element anchored with data-tour="<target>" */
  | { type: 'click'; target: string }
  /** Dispatches a mousedown on <body>: closes menus that use useClickOutside */
  | { type: 'click-outside' };

export interface TourChapter {
  id: string;
  label: string;
  emoji: string;
}

export interface TourStep {
  id: string;
  chapter: string;
  /** Page of the step, e.g. '/statistics' or '/garage?vehicleId=101' */
  route: string;
  /** data-tour value of the highlighted element; absent → centered card */
  target?: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** The visitor may use the page during this step (no veil, no click blockers) */
  interactive?: boolean;
  onEnter?: TourAction;
  onExit?: TourAction;
}

export interface TourState {
  status: TourStatus;
  stepIndex: number;
  /** Demo session the progress belongs to: a new demo starts over */
  sessionId: string;
}

export type TourCommand =
  | { type: 'START'; chapter?: string }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SKIP_CHAPTER' }
  | { type: 'GOTO_CHAPTER'; chapter: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'COMPLETE' };
