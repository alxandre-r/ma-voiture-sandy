/**
 * @file lib/demo/journal.ts
 * @description Encodes the visitor's edits into the demo cookie: "v1." + base64url(deflate(JSON)).
 * Server-only (node:zlib): imported by route handlers and lib/demo/server.ts, never by middleware.
 */

import { deflateRawSync, inflateRawSync } from 'node:zlib';

import { DEMO_COOKIE_MAX_BYTES, DEMO_JOURNAL_VERSION, DEMO_MAX_OPS } from './constants';
import { isDemoOp } from './ops';

import type { DemoOp } from './ops';

export interface DemoJournal {
  sessionId: string;
  ops: DemoOp[];
}

/** Session id used when a cookie cannot be read: stable, so the tour state is not reset on every request. */
const RECOVERED_SESSION_ID = 'recovered';
/** Max inflated JSON size: guards against a deflate bomb in a crafted cookie. */
const MAX_INFLATED_BYTES = 128 * 1024;

export function createJournal(sessionId: string): DemoJournal {
  return { sessionId, ops: [] };
}

export function encodeJournal(journal: DemoJournal): string {
  const json = JSON.stringify({ s: journal.sessionId, o: journal.ops });
  return `${DEMO_JOURNAL_VERSION}.${deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url')}`;
}

/**
 * Decodes a cookie value. Never throws: anything unreadable or oversized (the server never
 * issues a cookie beyond these caps, so it was crafted) yields an empty "recovered" journal.
 */
export function decodeJournal(raw: string): DemoJournal {
  if (raw.length > DEMO_COOKIE_MAX_BYTES) return createJournal(RECOVERED_SESSION_ID);
  const separator = raw.indexOf('.');
  if (separator === -1 || raw.slice(0, separator) !== DEMO_JOURNAL_VERSION) {
    return createJournal(RECOVERED_SESSION_ID);
  }
  try {
    const payload = inflateRawSync(Buffer.from(raw.slice(separator + 1), 'base64url'), {
      maxOutputLength: MAX_INFLATED_BYTES,
    });
    const parsed: unknown = JSON.parse(payload.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return createJournal(RECOVERED_SESSION_ID);
    const { s, o } = parsed as { s?: unknown; o?: unknown };
    if (typeof s !== 'string' || !Array.isArray(o) || o.length > DEMO_MAX_OPS) {
      return createJournal(RECOVERED_SESSION_ID);
    }
    return { sessionId: s, ops: o.filter(isDemoOp) };
  } catch {
    return createJournal(RECOVERED_SESSION_ID);
  }
}
