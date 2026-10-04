/**
 * @file __tests__/components/family/FamilyCardHeader.test.tsx
 * @description Family card header: owner/member actions (rename, delete, leave, invite)
 * wired through useFamilyActions to the /api/family/* routes.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRefresh = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

import { FamilyCardHeader } from '@/app/(app)/family/components/FamilyCardHeader';

import type { Family } from '@/types/family';

const family = {
  id: 'fam-1',
  name: 'Les Dupont',
  created_at: '2026-01-01T00:00:00Z',
  owner_id: 'user-1',
  invite_token: 'tok-123',
} as unknown as Family;

const fetchMock = vi.fn();

function mockFetchResponse(ok: boolean, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok, json: async () => body });
}

function openSettings() {
  fireEvent.click(screen.getByLabelText('Paramètres'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FamilyCardHeader', () => {
  it('shows the family name and a pluralized member count', () => {
    const { rerender } = render(<FamilyCardHeader family={family} isOwner memberCount={3} />);
    expect(screen.getByText('Les Dupont')).toBeTruthy();
    expect(screen.getByText('3 membres')).toBeTruthy();

    rerender(<FamilyCardHeader family={family} isOwner memberCount={1} />);
    expect(screen.getByText('1 membre')).toBeTruthy();
  });

  describe('owner', () => {
    it('offers invite, rename and delete but not leave', () => {
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);
      expect(screen.getByText('Inviter')).toBeTruthy();

      openSettings();
      expect(screen.getByText('Renommer')).toBeTruthy();
      expect(screen.getByText('Supprimer la famille')).toBeTruthy();
      expect(screen.queryByText('Quitter la famille')).toBeNull();
    });

    it('renames the family via PATCH /api/family/update and refreshes', async () => {
      mockFetchResponse(true, { success: true });
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);

      openSettings();
      fireEvent.click(screen.getByText('Renommer'));

      const input = screen.getByLabelText('Nouveau nom de la famille') as HTMLInputElement;
      expect(input.value).toBe('Les Dupont');
      fireEvent.change(input, { target: { value: '  Les Martin  ' } });
      fireEvent.click(screen.getByText('Enregistrer'));

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledWith('/api/family/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: 'fam-1', name: 'Les Martin' }),
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Famille renommée avec succès');
    });

    it('keeps the save button disabled while the name is unchanged or blank', () => {
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);
      openSettings();
      fireEvent.click(screen.getByText('Renommer'));

      const save = screen.getByText('Enregistrer').closest('button') as HTMLButtonElement;
      expect(save.disabled).toBe(true); // unchanged

      fireEvent.change(screen.getByLabelText('Nouveau nom de la famille'), {
        target: { value: '   ' },
      });
      expect(save.disabled).toBe(true); // blank
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows the API error, keeps the modal open and does not refresh when rename fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchResponse(false, { error: 'Seul le propriétaire peut modifier' });
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);

      openSettings();
      fireEvent.click(screen.getByText('Renommer'));
      fireEvent.change(screen.getByLabelText('Nouveau nom de la famille'), {
        target: { value: 'Autre nom' },
      });
      fireEvent.click(screen.getByText('Enregistrer'));

      await waitFor(() =>
        expect(mockShowError).toHaveBeenCalledWith('Seul le propriétaire peut modifier'),
      );
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Nouveau nom de la famille')).toBeTruthy();
    });

    it('deletes the family via DELETE /api/family/delete after confirmation', async () => {
      mockFetchResponse(true, { success: true });
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);

      openSettings();
      fireEvent.click(screen.getByText('Supprimer la famille'));
      expect(screen.getByText('Cette action est irréversible.')).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Supprimer'));

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledWith('/api/family/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: 'fam-1' }),
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Famille supprimée avec succès');
    });

    it('shows the invite link and code, and copies them', () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      render(<FamilyCardHeader family={family} isOwner memberCount={2} />);

      fireEvent.click(screen.getByText('Inviter'));
      const link = `${window.location.origin}/family/join?token=tok-123`;
      expect(screen.getByDisplayValue(link)).toBeTruthy();
      expect(screen.getByDisplayValue('tok-123')).toBeTruthy();

      const [copyLink, copyCode] = screen.getAllByText('Copier');
      fireEvent.click(copyLink);
      expect(writeText).toHaveBeenCalledWith(link);
      expect(mockShowSuccess).toHaveBeenCalledWith('Lien copié !');

      fireEvent.click(copyCode);
      expect(writeText).toHaveBeenCalledWith('tok-123');
      expect(mockShowSuccess).toHaveBeenCalledWith('Code copié !');
    });
  });

  describe('member', () => {
    it('only offers to leave the family', () => {
      render(<FamilyCardHeader family={family} isOwner={false} memberCount={2} />);
      expect(screen.queryByText('Inviter')).toBeNull();

      openSettings();
      expect(screen.getByText('Quitter la famille')).toBeTruthy();
      expect(screen.queryByText('Renommer')).toBeNull();
      expect(screen.queryByText('Supprimer la famille')).toBeNull();
    });

    it('leaves the family via POST /api/family/leave after confirmation', async () => {
      mockFetchResponse(true, { success: true });
      render(<FamilyCardHeader family={family} isOwner={false} memberCount={2} />);

      openSettings();
      fireEvent.click(screen.getByText('Quitter la famille'));
      expect(screen.getByText('Êtes-vous sûr de vouloir quitter cette famille ?')).toBeTruthy();

      fireEvent.click(screen.getByText('Quitter'));

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledWith('/api/family/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: 'fam-1' }),
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Vous avez quitté la famille avec succès');
    });
  });
});
