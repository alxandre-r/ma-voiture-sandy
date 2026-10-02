/**
 * @file lib/demo/server.ts
 * @description Server-only access to the demo session. Every lib/data fetcher calls getDemoSession()
 * first and answers from the demo state when it is not null.
 */

import { cookies } from 'next/headers';
import { cache } from 'react';

import { DEMO_COOKIE } from './constants';
import { toISODate } from './dates';
import { decodeJournal } from './journal';
import { buildDemoState } from './state';

import type { DemoJournal } from './journal';
import type { DemoState } from './types';

export interface DemoSession {
  journal: DemoJournal;
  state: DemoState;
}

/** The demo session of the current request, or null outside the demo. Memoized per request. */
export const getDemoSession = cache(async (): Promise<DemoSession | null> => {
  const raw = (await cookies()).get(DEMO_COOKIE)?.value;
  if (raw === undefined) return null;
  const journal = decodeJournal(raw);
  return { journal, state: buildDemoState(toISODate(new Date()), journal.ops) };
});
