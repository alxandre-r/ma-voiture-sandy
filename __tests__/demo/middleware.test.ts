// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  })),
}));

import { middleware } from '@/middleware';

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'http://localhost'), { headers: cookie ? { cookie } : {} });

describe('middleware demo routing', () => {
  it('rewrites API calls to the fake backend when the demo cookie is present', async () => {
    const res = await middleware(request('/api/fills/add?x=1', 'mv_demo=v1.abc'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/api/demo/fills/add?x=1');
  });

  it('never rewrites /api/demo/* twice', async () => {
    const res = await middleware(request('/api/demo/reset', 'mv_demo=v1.abc'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('keeps the real API untouched without the demo cookie', async () => {
    const res = await middleware(request('/api/fills/add'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('lets the demo win over a real Supabase session cookie (Review Focus #1)', async () => {
    const res = await middleware(
      request('/api/expenses/get', 'sb-upskwbjxrzykgtanqxsp-auth-token=xyz; mv_demo=v1.abc'),
    );
    expect(res.headers.get('x-middleware-rewrite')).toContain('/api/demo/expenses/get');
  });

  // Passes even without the isDemo page branch: isPublicPath() currently matches every path
  // (known bug, spec §3.3/§12).
  it('lets demo pages through without a Supabase session', async () => {
    const res = await middleware(request('/dashboard', 'mv_demo=v1.abc'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.status).toBe(200);
  });
});
