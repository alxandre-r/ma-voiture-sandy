/**
 * Middleware Next.js
 * ------------------
 * - Refreshes the Supabase session on every matched request (cookies written on the response).
 * - Protects private pages: without a user, redirects to / (or to /?redirect=… for invite links).
 * - Public: the landing page (/ exactly), /auth/*, /demo, and /api/* (routes return 401 themselves).
 * - Mode démo (cookie mv_demo) : les API sont réécrites vers /api/demo/*, les pages passent sans
 *   session, et rien n'atteint Supabase.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import { DEMO_COOKIE } from '@/lib/demo/constants';

import type { NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/auth', '/demo', '/api/'];

function isPublicPath(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Demo mode: never reach Supabase. API calls go to the sandboxed fake backend.
  if (req.cookies.has(DEMO_COOKIE)) {
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/demo/')) {
      const target = `/api/demo/${pathname.slice('/api/'.length)}${req.nextUrl.search}`;
      return NextResponse.rewrite(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // Session refresh (official @supabase/ssr pattern): token refreshes are written to both the
  // request (for this render) and the response (for the browser), with the no-store headers the
  // library sends so that no CDN ever caches a response carrying someone's session cookie.
  let response = NextResponse.next({ request: req });
  let authHeaders: Record<string, string> = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Only sent with the first write of this client: keep them for the redirect below too
          authHeaders = { ...authHeaders, ...headers };
          Object.entries(authHeaders).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getUser() validates the token with Supabase Auth (getSession() only reads the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user || isPublicPath(pathname)) return response;

  // Family join links: preserve the invite URL after login
  const target = pathname.startsWith('/family/join')
    ? '/?redirect=' + encodeURIComponent(pathname + req.nextUrl.search)
    : '/?reason=session_expired';
  const redirect = NextResponse.redirect(new URL(target, req.url));
  // Keep any cookie cleared by a failed refresh
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(authHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}

export const config = {
  // Everything except Next internals and static files (public/ assets have an extension)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
