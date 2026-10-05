import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

function mockFetch(...responses: Array<{ ok: boolean; body?: unknown }>) {
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce({ ok: r.ok, json: async () => r.body ?? {} });
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('uploadPendingAttachments', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns no warning when every file is uploaded', async () => {
    const fetchMock = mockFetch({ ok: true }, { ok: true });
    expect(await uploadPendingAttachments([file('a'), file('b')], 'expense', 3)).toEqual({
      failedCount: 0,
      warning: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("puts the server's reason in the warning (quota reached)", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch(
      { ok: true },
      { ok: false, body: { error: 'Limite atteinte : 10 pièces jointes maximum par élément' } },
    );
    expect(await uploadPendingAttachments([file('a'), file('b')], 'expense', 3)).toEqual({
      failedCount: 1,
      warning:
        "1 pièce(s) jointe(s) n'ont pas pu être téléchargées (Limite atteinte : 10 pièces jointes maximum par élément)",
    });
  });

  it('falls back to the count alone when the server gave no message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({ ok: false }, { ok: false });
    expect(await uploadPendingAttachments([file('a'), file('b')], 'vehicle', 9)).toEqual({
      failedCount: 2,
      warning: "2 pièce(s) jointe(s) n'ont pas pu être téléchargées",
    });
  });
});
