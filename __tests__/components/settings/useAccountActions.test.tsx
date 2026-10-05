import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  calls: [] as string[],
  updateError: null as { message: string } | null,
  demo: null as unknown,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/contexts/DemoContext', () => ({ useDemo: () => mock.demo }));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showInfo: vi.fn() }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          mock.calls.push(`upload ${bucket} ${path}`);
          return { error: null };
        },
        remove: async (paths: string[]) => {
          mock.calls.push(`remove ${bucket} ${paths.join(',')}`);
          return { error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
      }),
    },
    from: (table: string) => ({
      update: (row: Record<string, unknown>) => ({
        eq: async () => {
          mock.calls.push(`update ${table} ${JSON.stringify(row)}`);
          return { error: mock.updateError };
        },
      }),
    }),
  }),
}));

import useAccountActions, {
  avatarStoragePath,
} from '@/app/(app)/settings/hooks/useAccountActions';

import type { User } from '@/types/user';

const OLD_URL = 'https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar_100.png';
const user = { id: 'u1', name: 'Alex', email: 'a@b.c', avatar_url: OLD_URL } as unknown as User;

function setup(avatar_url: string | null = OLD_URL) {
  const showNotification = vi.fn();
  const { result } = renderHook(() =>
    useAccountActions({ user: { ...user, avatar_url } as User, showNotification }),
  );
  return { result, showNotification };
}

beforeEach(() => {
  mock.calls = [];
  mock.updateError = null;
  mock.demo = null;
  vi.spyOn(Date, 'now').mockReturnValue(200);
});
afterEach(() => vi.restoreAllMocks());

describe('avatarStoragePath', () => {
  it('extracts the bucket path from a public URL', () => {
    expect(avatarStoragePath(OLD_URL)).toBe('u1/avatar_100.png');
    expect(avatarStoragePath(`${OLD_URL}?t=1`)).toBe('u1/avatar_100.png');
    expect(avatarStoragePath('https://lh3.googleusercontent.com/a/xyz')).toBeNull();
  });
});

describe('useAccountActions.updateAvatar (B17)', () => {
  it('uploads, saves the row, then deletes the old file at its real path', async () => {
    const { result } = setup();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    await act(async () => {
      expect(await result.current.updateAvatar(file)).toBe(true);
    });
    expect(mock.calls).toEqual([
      'upload avatars u1/avatar_200.png',
      `update users {"avatar_url":"https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar_200.png"}`,
      'remove avatars u1/avatar_100.png',
    ]);
  });

  it('removing clears the row then deletes the stored file (not "<id>/avatar")', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.updateAvatar(null);
    });
    expect(mock.calls).toEqual([
      'update users {"avatar_url":null}',
      'remove avatars u1/avatar_100.png',
    ]);
    expect(result.current.localUser.avatar_url).toBeNull();
  });

  it('keeps the old file when the row update fails, and drops the new upload', async () => {
    mock.updateError = { message: 'boom' };
    const { result, showNotification } = setup();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    await act(async () => {
      expect(await result.current.updateAvatar(file)).toBe(false);
    });
    expect(mock.calls).toEqual([
      'upload avatars u1/avatar_200.png',
      `update users {"avatar_url":"https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar_200.png"}`,
      'remove avatars u1/avatar_200.png',
    ]);
    expect(showNotification).toHaveBeenCalledWith(
      'Erreur lors de la mise à jour du profil: boom',
      'error',
    );
  });

  it('never deletes an external avatar URL', async () => {
    const { result } = setup('https://lh3.googleusercontent.com/a/xyz');
    await act(async () => {
      await result.current.updateAvatar(null);
    });
    expect(mock.calls).toEqual(['update users {"avatar_url":null}']);
  });

  it('touches no storage in the demo', async () => {
    mock.demo = { sessionId: 's' };
    const { result } = setup();
    await act(async () => {
      expect(await result.current.updateAvatar(null)).toBe(false);
    });
    expect(mock.calls).toEqual([]);
  });
});
