import type { DemoOp } from '../ops';
import type { DemoState } from '../types';

export type JsonBody = Record<string, unknown>;

export interface DemoApiContext {
  state: DemoState;
  body: JsonBody;
  query: URLSearchParams;
  /** ISO timestamp of the request */
  now: string;
}

export interface DemoApiResult {
  status: number;
  json: unknown;
  /** Present only when the request changes the sandbox */
  op?: DemoOp;
}

export type DemoApiHandler = (ctx: DemoApiContext) => DemoApiResult;
