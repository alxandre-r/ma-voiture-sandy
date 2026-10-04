/**
 * @file __tests__/components/family/JoinFamilyClient.test.tsx
 * @description Invite landing page (/family/join?token=...): loads the family preview,
 * blocks users who already have a family, handles invalid tokens and joins.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockShowError = vi.fn();
let mockToken: string | null = 'tok-123';
let mockUser = { has_family: false };

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
// Stable references, like Next's hooks: the effect depends on searchParams.
const mockRouter = { push: mockPush, refresh: vi.fn() };
const mockSearchParams = { get: (key: string) => (key === 'token' ? mockToken : null) };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showError: mockShowError }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useUser: () => mockUser,
}));

import JoinFamilyClient from '@/app/(app)/family/join/JoinFamilyClient';

const fetchMock = vi.fn();
const invite = {
  id: 'fam-1',
  name: 'Les Dupont',
  created_at: '2026-01-01T00:00:00Z',
  owner_id: 'user-1',
  owner_user: null,
};

function respond(ok: boolean, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok, json: async () => body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockToken = 'tok-123';
  mockUser = { has_family: false };
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('JoinFamilyClient', () => {
  it('loads the invite preview from the token', async () => {
    respond(true, invite);
    render(<JoinFamilyClient />);

    expect(await screen.findByText('Les Dupont')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/family/getByInvitToken?token=tok-123');
    expect(screen.getByText('Vous avez été invité à rejoindre une famille')).toBeTruthy();
    expect(screen.getByText('Rejoindre cette famille')).toBeTruthy();
  });

  it('reports a missing token without calling the API', async () => {
    mockToken = null;
    render(<JoinFamilyClient />);

    expect(await screen.findByText('Invitation invalide')).toBeTruthy();
    expect(screen.getByText("Token d'invitation manquant")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API error and the expired-link hint for an unknown token', async () => {
    respond(false, { error: "Token d'invitation invalide" });
    render(<JoinFamilyClient />);

    expect(await screen.findByText("Token d'invitation invalide")).toBeTruthy();
    expect(screen.getByText(/Le lien d'invitation est peut-être expiré/)).toBeTruthy();

    fireEvent.click(screen.getByText('Retour au tableau de bord'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('blocks a user who already has a family', async () => {
    mockUser = { has_family: true };
    render(<JoinFamilyClient />);

    expect(await screen.findByText("Vous faites déjà partie d'une famille")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Retour à ma famille'));
    expect(mockPush).toHaveBeenCalledWith('/family');
  });

  it('joins via POST /api/family/join and goes to /family', async () => {
    respond(true, invite);
    respond(true, { success: true });
    render(<JoinFamilyClient />);

    fireEvent.click(await screen.findByText('Rejoindre cette famille'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/family'));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/family/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'tok-123' }),
    });
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('shows a toast and stays on the page when joining fails', async () => {
    respond(true, invite);
    respond(false, { error: 'Vous êtes déjà membre de cette famille' });
    render(<JoinFamilyClient />);

    fireEvent.click(await screen.findByText('Rejoindre cette famille'));

    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith('Vous êtes déjà membre de cette famille'),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
