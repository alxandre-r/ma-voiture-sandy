// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };
type CookieAdapter = { getAll: () => unknown; setAll: (c: CookieToSet[]) => void };

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  refreshed: [] as { name: string; value: string }[],
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: CookieAdapter }) => ({
    auth: {
      getUser: async () => {
        if (state.refreshed.length) opts.cookies.setAll(state.refreshed);
        return { data: { user: state.user } };
      },
    },
  }),
}));

import { config, middleware } from '@/middleware';

const request = (path: string) => new NextRequest(new URL(path, 'http://localhost'));

beforeEach(() => {
  state.user = null;
  state.refreshed = [];
});

describe('middleware access control', () => {
  it.each(['/dashboard', '/garage', '/settings', '/expenses?x=1'])(
    'redirects %s to the landing page without a session',
    async (path) => {
      const res = await middleware(request(path));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost/?reason=session_expired');
    },
  );

  it('keeps the invite link in ?redirect= for /family/join', async () => {
    const res = await middleware(request('/family/join?token=abc'));
    expect(res.headers.get('location')).toBe(
      'http://localhost/?redirect=' + encodeURIComponent('/family/join?token=abc'),
    );
  });

  it.each(['/', '/auth/callback', '/demo', '/api/expenses/get'])(
    'lets public path %s through without a session',
    async (path) => {
      const res = await middleware(request(path));
      expect(res.headers.get('location')).toBeNull();
      expect(res.status).toBe(200);
    },
  );

  it('lets a signed-in user through', async () => {
    state.user = { id: 'u1' };
    const res = await middleware(request('/dashboard'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('writes refreshed session cookies on the response', async () => {
    state.user = { id: 'u1' };
    state.refreshed = [{ name: 'sb-x-auth-token', value: 'new' }];
    const res = await middleware(request('/dashboard'));
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('new');
  });

  it('keeps cookies cleared by a failed refresh on the redirect', async () => {
    state.refreshed = [{ name: 'sb-x-auth-token', value: '' }];
    const res = await middleware(request('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('');
  });
});

describe('middleware matcher', () => {
  const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

  it('runs on pages and API routes', () => {
    for (const p of ['/', '/dashboard', '/family/join', '/api/fills/add']) {
      expect(matches(p)).toBe(true);
    }
  });

  it('skips Next internals and static files', () => {
    for (const p of ['/_next/static/x.js', '/_next/image', '/favicon.ico', '/icons/add.svg']) {
      expect(matches(p)).toBe(false);
    }
  });
});
