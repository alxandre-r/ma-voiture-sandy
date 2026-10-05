/**
 * @file __tests__/components/family/VehiclePermissions.test.tsx
 * @description B14: "Droits" only for the vehicle owner; the permissions modal never saves
 * after a failed GET (it would wipe every permission).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

import { FamilyCardVehiclesClient } from '@/app/(app)/family/components/FamilyCardVehiclesClient';
import { VehiclePermissionsModal } from '@/app/(app)/family/components/VehiclePermissionsModal';

const fetchMock = vi.fn();
const members = [
  { user_id: 'me', user_name: 'Moi' },
  { user_id: 'bob', user_name: 'Bob' },
];

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

function renderModal() {
  return render(
    <VehiclePermissionsModal
      isOpen
      onClose={vi.fn()}
      vehicleId={3}
      vehicleLabel="Clio"
      members={members}
      currentUserId="me"
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FamilyCardVehiclesClient', () => {
  const vehicle = {
    make: 'Renault',
    model: 'Clio',
    year: null,
    image: null,
    name: null,
    owner_name: 'Bob',
  };

  it('shows "Droits" on the user own vehicle only', () => {
    render(
      <FamilyCardVehiclesClient
        vehicles={[
          { ...vehicle, vehicle_id: 1, owner_id: 'me' },
          { ...vehicle, vehicle_id: 2, owner_id: 'bob', permission_level: 'write' },
        ]}
        members={members}
        currentUserId="me"
      />,
    );
    expect(screen.getAllByRole('button', { name: /Droits/ })).toHaveLength(1);
    expect(screen.getByText('Modification')).toBeTruthy();
  });
});

describe('VehiclePermissionsModal', () => {
  it('loads the current permissions and saves them', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { data: [{ user_id: 'bob', permission_level: 'write' }] }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));
    renderModal();
    const save = await screen.findByRole('button', { name: 'Enregistrer' });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[1];
    expect(JSON.parse(init.body).permissions).toEqual([{ userId: 'bob', level: 'write' }]);
  });

  it('shows the error and disables saving when the GET fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { error: 'Véhicule introuvable ou accès refusé' }),
    );
    renderModal();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Véhicule introuvable ou accès refusé');
    const save = screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a network error the same way', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderModal();
    await screen.findByRole('alert');
    expect(
      (screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
