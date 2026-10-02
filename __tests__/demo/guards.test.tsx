import { readFileSync } from 'node:fs';

import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browserClient = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: browserClient }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));

import LogoutButton from '@/components/auth/LogoutButton';
import AttachmentUploader from '@/components/common/attachments/AttachmentUploader';
import { DemoProvider } from '@/contexts/DemoContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import useVehicleImageUpload from '@/hooks/vehicle/useVehicleImageUpload';

import type { ReactNode } from 'react';

const inDemo = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>
    <DemoProvider sessionId="s">{children}</DemoProvider>
  </NotificationProvider>
);
const outsideDemo = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

beforeEach(() => {
  browserClient.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}')),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('demo guards', () => {
  it('disables attachments in the demo only', () => {
    const { unmount } = render(<AttachmentUploader onFilesSelected={vi.fn()} />, {
      wrapper: inDemo,
    });
    expect(
      screen.getByRole('button', { name: /Pièces jointes désactivées dans la démo/ }),
    ).toBeDisabled();
    unmount();
    render(<AttachmentUploader onFilesSelected={vi.fn()} />, { wrapper: outsideDemo });
    expect(screen.getByRole('button', { name: /Ajouter des pièces jointes/ })).toBeEnabled();
  });

  it('turns logout into "Quitter la démo"', async () => {
    render(<LogoutButton />, { wrapper: inDemo });
    fireEvent.click(screen.getByRole('button', { name: 'Quitter la démo' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/demo/exit', { method: 'POST' }));
    expect(browserClient).not.toHaveBeenCalled();
  });

  it('never uploads vehicle photos in the demo', async () => {
    const { result } = renderHook(() => useVehicleImageUpload({ showNotification: vi.fn() }), {
      wrapper: inDemo,
    });
    const file = new File(['x'], 'car.png', { type: 'image/png' });
    await expect(result.current.uploadVehicleImage(file)).resolves.toBeNull();
    expect(browserClient).not.toHaveBeenCalled();
  });

  it('links to /demo with a plain <a> so it is never prefetched (Review Focus #5)', () => {
    const source = readFileSync('app/LandingPageClient.tsx', 'utf8');
    expect(source).toContain('href="/demo"');
    expect(source).not.toMatch(/<Link[^>]*href="\/demo"/);
  });

  it('leaves the demo before any real authentication call', () => {
    for (const file of [
      'components/auth/forms/SignInForm.tsx',
      'components/auth/forms/SignUpForm.tsx',
    ]) {
      const source = readFileSync(file, 'utf8');
      const exitAt = source.indexOf('await exitDemoSession()');
      const authAt = Math.min(
        ...[
          source.indexOf('signInWithPassword'),
          source.indexOf("fetch('/api/auth/sign-up'"),
        ].filter((i) => i !== -1),
      );
      expect(exitAt).toBeGreaterThan(-1);
      expect(exitAt).toBeLessThan(authAt);
    }
  });
});
