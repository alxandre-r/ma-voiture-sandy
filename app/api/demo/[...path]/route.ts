/**
 * @file app/api/demo/[...path]/route.ts
 * @description Fake backend of the demo. middleware.tsx rewrites every /api/* call here when the
 * demo cookie is present, so the real API routes (and Supabase) are never reached in demo mode.
 */

import { NextResponse } from 'next/server';

import { handleDemoApiRequest } from '@/lib/demo/api/handleRequest';
import { readJsonBody } from '@/lib/demo/api/readJsonBody';
import { DEMO_COOKIE, demoCookieOptions } from '@/lib/demo/constants';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const result = handleDemoApiRequest({
    method: request.method,
    path: path.join('/'),
    rawCookie: request.cookies.get(DEMO_COOKIE)?.value,
    body: await readJsonBody(request),
    query: request.nextUrl.searchParams,
    now: new Date(),
  });
  const response = NextResponse.json(result.json, { status: result.status });
  if (result.cookie) response.cookies.set(DEMO_COOKIE, result.cookie, demoCookieOptions());
  return response;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
