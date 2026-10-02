import { NextResponse } from 'next/server';

import { DEMO_COOKIE, demoCookieOptions } from '@/lib/demo/constants';

/** Leaves the demo. Also called before any real sign-in/sign-up (harmless without the cookie). */
export function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DEMO_COOKIE, '', { ...demoCookieOptions(), maxAge: 0 });
  return response;
}
