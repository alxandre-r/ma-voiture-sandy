import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const notify = vi.hoisted(() => ({
  showNotification: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => notify }));
vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dashboard',
}));

import DemoBanner from '@/components/demo/DemoBanner';
import DemoShell from '@/components/demo/DemoShell';
import { UserProvider } from '@/contexts/UserContext';
import { TOUR_STORAGE_KEY } from '@/lib/demo/client';
import { TOUR_RELAUNCH_HINT } from '@/lib/demo/tour/steps';

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

function renderShell() {
  return render(
    <UserProvider user={user}>
      <DemoShell sessionId="s1">
        <DemoBanner />
      </DemoShell>
    </UserProvider>,
  );
}
const storeTour = (value: object) =>
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ sessionId: 's1', ...value }));

beforeEach(() => {
  localStorage.clear();
  notify.showInfo.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}')),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('DemoShell', () => {
  it('welcomes a new visitor with the two choices', () => {
    renderShell();
    expect(screen.getByRole('dialog', { name: 'Bienvenue dans Ma Voiture.' })).toBeInTheDocument();
    expect(screen.getByText(/Vous êtes Camille/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explorer librement' })).toBeInTheDocument();
  });

  it('starts the guided tour on its first step', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Visite guidée (~3 min)' }));
    expect(screen.getByRole('dialog', { name: "L'essentiel en 4 chiffres" })).toBeInTheDocument();
  });

  it('quits with Escape and explains how to relaunch the tour', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Visite guidée (~3 min)' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notify.showInfo).toHaveBeenCalledWith(TOUR_RELAUNCH_HINT);
  });

  it('relaunches the tour from the banner after a free exploration', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Explorer librement' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notify.showInfo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Visite guidée' }));
    expect(screen.getByRole('dialog', { name: "L'essentiel en 4 chiffres" })).toBeInTheDocument();
  });

  it('resumes a paused tour and heads to the step page', () => {
    storeTour({ status: 'paused', stepIndex: 5 });
    renderShell();
    expect(screen.getByRole('button', { name: 'Reprendre la visite' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la visite · 6/19' }));
    // Step 6 lives on /statistics while the (mocked) pathname stays on /dashboard
    expect(screen.getByRole('dialog', { name: 'Direction les statistiques…' })).toBeInTheDocument();
  });

  it('ends with the final card, which leads to sign-up', async () => {
    storeTour({ status: 'done', stepIndex: 18 });
    renderShell();
    expect(screen.getByRole('dialog', { name: 'Vous avez fait le tour !' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/demo/exit', { method: 'POST' }));
  });
});
