import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => '/dashboard',
}));
vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));

import DemoBanner from '@/components/demo/DemoBanner';
import { DemoProvider } from '@/contexts/DemoContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { UserProvider } from '@/contexts/UserContext';

import type { User } from '@/types/user';

const user: User = {
  id: 'u1',
  email: 'camille.durand@example.com',
  name: 'Camille Durand',
  avatar_url: null,
  has_family: true,
  families: [],
  has_vehicles: true,
  vehicle_count: 2,
  vehicle_ids: [101, 102],
  created_at: '2024-08-01T09:12:00+00:00',
};

function renderBanner(inDemo: boolean) {
  return render(
    <NotificationProvider>
      <UserProvider user={user}>
        {inDemo ? (
          <DemoProvider sessionId="s1">
            <DemoBanner />
          </DemoProvider>
        ) : (
          <DemoBanner />
        )}
      </UserProvider>
    </NotificationProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{"success":true}', { status: 200 })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe('DemoBanner', () => {
  it('renders nothing outside the demo', () => {
    renderBanner(false);
    expect(screen.queryByText('Mode démo')).toBeNull();
  });

  it('introduces the persona', () => {
    renderBanner(true);
    expect(screen.getByText('Mode démo')).toBeInTheDocument();
    expect(screen.getByText(/vous êtes Camille/)).toBeInTheDocument();
  });

  it('resets the sandbox after confirmation', async () => {
    renderBanner(true);
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser la démo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, réinitialiser' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/demo/reset', { method: 'POST' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
