import { NextResponse } from 'next/server';

import { DEMO_COOKIE, DEMO_SESSION_MISSING_MESSAGE, demoCookieOptions } from '@/lib/demo/constants';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';

import type { NextRequest } from 'next/server';

/** Restores the original demo data (empties the journal, keeps the session id). */
export function POST(request: NextRequest) {
  const raw = request.cookies.get(DEMO_COOKIE)?.value;
  if (raw === undefined) {
    return NextResponse.json({ error: DEMO_SESSION_MISSING_MESSAGE }, { status: 401 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(
    DEMO_COOKIE,
    encodeJournal(createJournal(decodeJournal(raw).sessionId)),
    demoCookieOptions(),
  );
  return response;
}
