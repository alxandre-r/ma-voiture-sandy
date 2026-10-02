// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const failure = vi.hoisted(() => new Error('boom'));
vi.mock('@/lib/demo/api/router', () => ({
  dispatchDemoApi: () => {
    throw failure;
  },
}));

import { handleDemoApiRequest } from '@/lib/demo/api/handleRequest';
import { createJournal, encodeJournal } from '@/lib/demo/journal';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleDemoApiRequest unexpected errors', () => {
  it('logs the error before answering 500', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = handleDemoApiRequest({
      method: 'POST',
      path: 'fills/add',
      rawCookie: encodeJournal(createJournal('s')),
      body: {},
      query: new URLSearchParams(),
      now: new Date('2026-10-01T10:00:00Z'),
    });
    expect(result).toEqual({ status: 500, json: { error: 'Erreur serveur inattendue' } });
    expect(consoleError).toHaveBeenCalledWith('[demo api]', 'POST', 'fills/add', failure);
  });
});
