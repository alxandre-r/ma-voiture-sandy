/**
 * @file __tests__/components/family/AddFamilyForm.test.tsx
 * @description Create-family form: field constraints, POST /api/family/create, toasts, refresh.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRefresh = vi.fn();
const mockShowNotification = vi.fn();

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showNotification: mockShowNotification }),
}));

import { AddFamilyForm } from '@/app/(app)/family/components/forms/AddFamilyForm';

const fetchMock = vi.fn();
const createdFamily = {
  id: 'fam-1',
  name: 'Les Dupont',
  created_at: '2026-01-01T00:00:00Z',
  owner: 'user-1',
};

function fillAndSubmit(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Entrez le nom de votre famille'), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Créer la famille' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AddFamilyForm', () => {
  it('renders a required name field (2-100 chars) and a submit button', () => {
    render(<AddFamilyForm />);
    const input = screen.getByPlaceholderText('Entrez le nom de votre famille') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.minLength).toBe(2);
    expect(input.maxLength).toBe(100);
    expect(screen.getByRole('button', { name: 'Créer la famille' })).toBeTruthy();
  });

  it('does not submit an empty name (HTML validation)', () => {
    render(<AddFamilyForm />);
    fillAndSubmit('');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('creates the family, notifies, calls back and refreshes', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, family: createdFamily }),
    });
    const onFamilyCreated = vi.fn();
    render(<AddFamilyForm onFamilyCreated={onFamilyCreated} />);

    fillAndSubmit('Les Dupont');

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/family/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Les Dupont' }),
    });
    expect(mockShowNotification).toHaveBeenCalledWith('Famille créée avec succès !', 'success');
    expect(onFamilyCreated).toHaveBeenCalledWith(createdFamily);
  });

  it('shows the API error and neither calls back nor refreshes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Le nom est trop long' }),
    });
    const onFamilyCreated = vi.fn();
    render(<AddFamilyForm onFamilyCreated={onFamilyCreated} />);

    fillAndSubmit('Les Dupont');

    await waitFor(() =>
      expect(mockShowNotification).toHaveBeenCalledWith('Le nom est trop long', 'error'),
    );
    expect(onFamilyCreated).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    // The button comes back for a retry
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Créer la famille' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });

  it('falls back to a generic message when the API gives none', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<AddFamilyForm />);

    fillAndSubmit('Les Dupont');

    await waitFor(() =>
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Erreur lors de la création de la famille',
        'error',
      ),
    );
  });
});
