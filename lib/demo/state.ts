import { applyOp } from './ops';
import { buildDemoSeed } from './seed';

import type { DemoOp } from './ops';
import type { DemoState } from './types';

/** Seed of the day + the visitor's journal. A malformed op is skipped, never fatal. */
export function buildDemoState(today: string, ops: readonly DemoOp[]): DemoState {
  const state = buildDemoSeed(today);
  for (const op of ops) {
    try {
      applyOp(state, op);
    } catch {
      // Malformed op (tampered or outdated cookie): ignore it and keep the demo usable
    }
  }
  return state;
}
