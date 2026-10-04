// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST as apiPost } from '@/app/api/demo/[...path]/route';
import { POST as exitPost } from '@/app/api/demo/exit/route';
import { POST as resetPost } from '@/app/api/demo/reset/route';
import { GET as enterDemo } from '@/app/demo/route';
import { readJsonBody } from '@/lib/demo/api/readJsonBody';
import { createJournal, decodeJournal, encodeJournal } from '@/lib/demo/journal';

type TestInit = { method?: string; body?: string; headers?: Record<string, string> };

const withCookie = (path: string, cookie?: string, init: TestInit = {}) =>
  new NextRequest(new URL(path, 'http://localhost'), {
    ...init,
    headers: { ...(cookie ? { cookie: `mv_demo=${cookie}` } : {}), ...init.headers },
  });

describe('GET /demo', () => {
  it('creates the sandbox cookie and opens the dashboard', () => {
    const res = enterDemo(withCookie('/demo'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
    const value = res.cookies.get('mv_demo')?.value;
    expect(value && decodeJournal(value).ops).toEqual([]);
    expect(res.cookies.get('mv_demo')?.httpOnly).toBe(true);
  });

  it('keeps an existing sandbox', () => {
    const res = enterDemo(withCookie('/demo', encodeJournal(createJournal('kept'))));
    expect(res.cookies.get('mv_demo')).toBeUndefined();
  });
});

describe('/api/demo/reset and /api/demo/exit', () => {
  it('empties the journal but keeps the session id', () => {
    const raw = encodeJournal({ sessionId: 'abc', ops: [{ t: 'profile.update', name: 'X' }] });
    const res = resetPost(withCookie('/api/demo/reset', raw));
    expect(decodeJournal(res.cookies.get('mv_demo')!.value)).toEqual({ sessionId: 'abc', ops: [] });
    expect(resetPost(withCookie('/api/demo/reset')).status).toBe(401);
  });

  it('removes the demo cookie', () => {
    const res = exitPost();
    expect(res.cookies.get('mv_demo')?.value).toBe('');
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });

  it('removes only the demo cookie, never a real Supabase one (Review Focus #1)', () => {
    const setCookie = exitPost().headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('mv_demo=');
    expect(setCookie).not.toMatch(/sb-/);
  });
});

describe('/api/demo/[...path]', () => {
  it('runs the fake backend and returns the updated cookie', async () => {
    const res = await apiPost(
      withCookie('/api/demo/expenses/other/add', encodeJournal(createJournal('s')), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vehicle_id: 101, date: '2026-10-01', amount: 12, label: 'Lavage' }),
      }),
      { params: Promise.resolve({ path: ['expenses', 'other', 'add'] }) },
    );
    expect(res.status).toBe(201);
    expect(decodeJournal(res.cookies.get('mv_demo')!.value).ops).toHaveLength(1);
  });
});

describe('readJsonBody (Review Focus #3)', () => {
  const post = (body: BodyInit, type?: string) =>
    new Request('http://localhost/x', {
      method: 'POST',
      body,
      headers: type ? { 'content-type': type } : {},
    });

  it('reads a JSON object', async () => {
    await expect(readJsonBody(post('{"a":1}', 'application/json'))).resolves.toEqual({ a: 1 });
  });

  it('turns invalid JSON, arrays and multipart uploads into an empty body', async () => {
    await expect(readJsonBody(post('not json', 'application/json'))).resolves.toEqual({});
    await expect(readJsonBody(post('[1,2]', 'application/json'))).resolves.toEqual({});
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.png');
    await expect(readJsonBody(post(form))).resolves.toEqual({});
  });
});
