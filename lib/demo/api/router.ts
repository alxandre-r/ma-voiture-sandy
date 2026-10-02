import { DEMO_UNAVAILABLE_MESSAGE } from '../constants';

import { accountHandlers } from './handlers/account';
import { expenseHandlers } from './handlers/expenses';
import { insuranceHandlers } from './handlers/insurance';
import { readHandlers } from './handlers/reads';
import { reminderHandlers } from './handlers/reminders';
import { vehicleHandlers } from './handlers/vehicles';
import { fail } from './helpers';

import type { DemoApiContext, DemoApiHandler, DemoApiResult } from './types';

/** "METHOD path" -> handler. Paths are relative to /api (e.g. "POST fills/add"). */
const HANDLERS: Record<string, DemoApiHandler> = {
  ...readHandlers,
  ...expenseHandlers,
  ...reminderHandlers,
  ...insuranceHandlers,
  ...vehicleHandlers,
  ...accountHandlers,
};

export function dispatchDemoApi(method: string, path: string, ctx: DemoApiContext): DemoApiResult {
  const key = `${method.toUpperCase()} ${path.replace(/^\/+|\/+$/g, '')}`;
  const handler = HANDLERS[key];
  return handler ? handler(ctx) : fail(501, DEMO_UNAVAILABLE_MESSAGE);
}
