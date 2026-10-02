/**
 * @file lib/demo/api/handleRequest.ts
 * @description Framework-free core of /api/demo/[...path]: cookie -> state -> handler -> new cookie.
 */

import {
  DEMO_COOKIE_MAX_BYTES,
  DEMO_LIMIT_MESSAGE,
  DEMO_SESSION_MISSING_MESSAGE,
} from '../constants';
import { toISODate } from '../dates';
import { decodeJournal, encodeJournal } from '../journal';
import { buildDemoState } from '../state';

import { dispatchDemoApi } from './router';

import type { JsonBody } from './types';

export interface DemoHttpRequest {
  method: string;
  path: string;
  rawCookie: string | undefined;
  body: JsonBody;
  query: URLSearchParams;
  now: Date;
}

export interface DemoHttpResponse {
  status: number;
  json: unknown;
  /** New cookie value, only when the sandbox changed */
  cookie?: string;
}

export function handleDemoApiRequest(request: DemoHttpRequest): DemoHttpResponse {
  if (request.rawCookie === undefined) {
    return { status: 401, json: { error: DEMO_SESSION_MISSING_MESSAGE } };
  }
  try {
    const journal = decodeJournal(request.rawCookie);
    const state = buildDemoState(toISODate(request.now), journal.ops);
    const result = dispatchDemoApi(request.method, request.path, {
      state,
      body: request.body,
      query: request.query,
      now: request.now.toISOString(),
    });
    if (!result.op) return { status: result.status, json: result.json };

    const cookie = encodeJournal({ ...journal, ops: [...journal.ops, result.op] });
    if (cookie.length > DEMO_COOKIE_MAX_BYTES) {
      return { status: 409, json: { error: DEMO_LIMIT_MESSAGE } };
    }
    return { status: result.status, json: result.json, cookie };
  } catch {
    return { status: 500, json: { error: 'Erreur serveur inattendue' } };
  }
}
