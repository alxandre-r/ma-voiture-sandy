import { DEMO_UNAVAILABLE_MESSAGE } from '../constants';

import { readHandlers } from './handlers/reads';
import { fail } from './helpers';

import type { DemoApiContext, DemoApiHandler, DemoApiResult } from './types';

/** "METHOD path" -> handler. Paths are relative to /api (e.g. "POST fills/add"). */
const HANDLERS: Record<string, DemoApiHandler> = {
  ...readHandlers,
};

export function dispatchDemoApi(method: string, path: string, ctx: DemoApiContext): DemoApiResult {
  const key = `${method.toUpperCase()} ${path.replace(/^\/+|\/+$/g, '')}`;
  const handler = HANDLERS[key];
  return handler ? handler(ctx) : fail(501, DEMO_UNAVAILABLE_MESSAGE);
}
