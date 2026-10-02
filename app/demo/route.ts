/**
 * @file app/demo/route.ts
 * @description Entry point of the free-access demo: sets the sandbox cookie (keeping an existing
 * one) and opens the dashboard. Link to it with a plain <a>, never next/link (no prefetch).
 */

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { DEMO_COOKIE, demoCookieOptions } from '@/lib/demo/constants';
import { createJournal, encodeJournal } from '@/lib/demo/journal';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  if (!request.cookies.has(DEMO_COOKIE)) {
    response.cookies.set(
      DEMO_COOKIE,
      encodeJournal(createJournal(randomUUID())),
      demoCookieOptions(),
    );
  }
  return response;
}
