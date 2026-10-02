/**
 * Middleware Next.js
 * ------------------
 * - Protège les pages privées en redirigeant vers / si l'utilisateur n'est pas connecté.
 * - Laisse passer les pages publiques (/, /auth/*, /api/*, etc.)
 * - Lorsque c'est un lien d'invitation, si !session, redirige vers la page de connexion en passant le token
 * - Mode démo (cookie mv_demo) : les API sont réécrites vers /api/demo/*, les pages passent sans session.
 */

import { NextResponse } from 'next/server';

import { DEMO_COOKIE } from '@/lib/demo/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/auth', '/api/', '/demo', '/_next', '/icons/', '/images/', '/favicon'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDemo = req.cookies.has(DEMO_COOKIE);

  // Demo mode: every API call is answered by the sandboxed fake backend (never Supabase)
  if (isDemo && pathname.startsWith('/api/') && !pathname.startsWith('/api/demo/')) {
    const target = `/api/demo/${pathname.slice('/api/'.length)}${req.nextUrl.search}`;
    return NextResponse.rewrite(new URL(target, req.url));
  }

  // Skip public paths and static assets
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    if (pathname.startsWith('/_next/static/')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (pathname.startsWith('/icons/') || pathname.startsWith('/images/')) {
      response.headers.set('Cache-Control', 'public, max-age=86400');
    }
    return response;
  }

  // Demo pages never need a Supabase session
  if (isDemo) return NextResponse.next();

  // All other paths are protected — verify session
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Family join links: preserve the invite URL after login
    if (pathname.startsWith('/family/join')) {
      return NextResponse.redirect(
        new URL('/?redirect=' + encodeURIComponent(pathname + req.nextUrl.search), req.url),
      );
    }
    return NextResponse.redirect(new URL('/?reason=session_expired', req.url));
  }

  return NextResponse.next();
}
