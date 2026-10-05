import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiCall: vi.fn(),
  upload: vi.fn(async () => ({ failedCount: 0, warning: null as string | null })),
  showWarning: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: mocks.showWarning,
  }),
}));
vi.mock('@/lib/api/client', () => ({ apiCall: mocks.apiCall }));
vi.mock('@/lib/utils/uploadAttachments', () => ({ uploadPendingAttachments: mocks.upload }));
vi.mock('@/app/(app)/garage/components/VehicleDetail', () => ({
  default: ({ vehicle }: { vehicle: { odometer: number } }) => (
    <p data-testid="detail">{vehicle.odometer} km</p>
  ),
}));
vi.mock('@/app/(app)/garage/components/GarageVehiclesList', () => ({
  GarageVehiclesList: ({
    vehicles,
    onVehicleClick,
  }: {
    vehicles: { vehicle_id: number; name: string }[];
    onVehicleClick: (v: unknown) => void;
  }) => (
    <>
      {vehicles.map((v) => (
        <button key={v.vehicle_id} onClick={() => onVehicleClick(v)}>
          {v.name}
        </button>
      ))}
    </>
  ),
}));
vi.mock('@/app/(app)/garage/components/FamilyVehiclesList', () => ({
  FamilyVehiclesList: () => null,
}));
vi.mock('@/app/(app)/garage/components/EmptyGarage', () => ({ default: () => null }));
vi.mock('@/app/(app)/garage/components/forms/VehicleForm', () => ({ default: () => null }));

import GarageClient from '@/app/(app)/garage/GarageClient';
import { useGarageActions } from '@/app/(app)/garage/hooks/useGarageActions';

import type { Vehicle } from '@/types/vehicle';

beforeEach(() => {
  mocks.apiCall.mockReset();
  mocks.upload.mockClear();
  mocks.showWarning.mockClear();
  window.scrollTo = vi.fn();
});

describe('GarageClient detail (B15)', () => {
  it('shows the refreshed vehicle after router.refresh() brings new props', () => {
    const v = (odometer: number) => ({ vehicle_id: 1, name: 'Clio', odometer }) as Vehicle;
    const { rerender } = render(<GarageClient userVehicles={[v(1000)]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clio' }));
    expect(screen.getByTestId('detail').textContent).toBe('1000 km');
    rerender(<GarageClient userVehicles={[v(1500)]} />);
    expect(screen.getByTestId('detail').textContent).toBe('1500 km');
  });
});

describe('useGarageActions.handleSaveVehicle (B2)', () => {
  it('uploads pending attachments to the id returned by vehicles/add', async () => {
    mocks.apiCall.mockResolvedValue({ vehicle: { id: 42, owner_id: 'u1' } });
    const { result } = renderHook(() => useGarageActions());
    const file = new File(['x'], 'carte-grise.pdf');
    await act(async () => {
      expect(await result.current.handleSaveVehicle({ make: 'Renault' }, [file])).toBe(true);
    });
    expect(mocks.upload).toHaveBeenCalledWith([file], 'vehicle', 42);
    expect(mocks.showWarning).not.toHaveBeenCalled();
  });

  it('warns when some attachments failed', async () => {
    mocks.apiCall.mockResolvedValue({ vehicle: { id: 42 } });
    mocks.upload.mockResolvedValueOnce({
      failedCount: 1,
      warning: "1 pièce(s) jointe(s) n'ont pas pu être téléchargées",
    });
    const { result } = renderHook(() => useGarageActions());
    await act(async () => {
      await result.current.handleSaveVehicle({ make: 'Renault' }, [new File(['x'], 'a.pdf')]);
    });
    expect(mocks.showWarning).toHaveBeenCalledWith(
      "1 pièce(s) jointe(s) n'ont pas pu être téléchargées",
    );
  });
});
