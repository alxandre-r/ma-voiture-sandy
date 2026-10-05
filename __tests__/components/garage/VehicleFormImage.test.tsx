import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteVehicleImage = vi.hoisted(() => vi.fn(async (_url: string) => true));
const { NEW_1, NEW_2 } = vi.hoisted(() => ({
  NEW_1: 'https://x.supabase.co/storage/v1/object/public/vehicles/u1/new-1.png',
  NEW_2: 'https://x.supabase.co/storage/v1/object/public/vehicles/u1/new-2.png',
}));

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/components/common/attachments/AttachmentSection', () => ({ default: () => null }));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));
vi.mock('@/hooks/vehicle/useVehicleImageUpload', () => ({
  default: () => ({ uploadVehicleImage: vi.fn(), deleteVehicleImage }),
}));
// Stand-in for the crop/upload modal: each button reports what the real one would
vi.mock('@/app/(app)/garage/components/modals/VehicleImageModal', () => ({
  default: ({ onSave, onRemove }: { onSave: (url: string) => void; onRemove: () => void }) => (
    <>
      <button type="button" onClick={() => onSave(NEW_1)}>
        upload-1
      </button>
      <button type="button" onClick={() => onSave(NEW_2)}>
        upload-2
      </button>
      <button type="button" onClick={onRemove}>
        remove
      </button>
    </>
  ),
}));

import VehicleForm from '@/app/(app)/garage/components/forms/VehicleForm';

import type { Vehicle } from '@/types/vehicle';

const OLD = 'https://x.supabase.co/storage/v1/object/public/vehicles/u1/old.png';
const vehicle = { vehicle_id: 7, make: 'Renault', model: 'Zoe', image: OLD } as Vehicle;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const submit = async (container: HTMLElement) => {
  await act(async () => {
    fireEvent.submit(container.querySelector('form#vehicle-form')!);
  });
};

beforeEach(() => deleteVehicleImage.mockClear());

describe('VehicleForm image files (B17)', () => {
  it('deletes the old file only after the vehicle row is saved', async () => {
    let resolveSave: (ok: boolean) => void = () => {};
    const onSave = vi.fn(() => new Promise<boolean>((r) => (resolveSave = r)));
    const { container } = render(
      <VehicleForm vehicle={vehicle} onSave={onSave} onCancel={vi.fn()} />,
    );
    click('upload-1');
    await submit(container);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ image: NEW_1 }), []);
    expect(deleteVehicleImage).not.toHaveBeenCalled();
    await act(async () => resolveSave(true));
    expect(deleteVehicleImage).toHaveBeenCalledExactlyOnceWith(OLD);
  });

  it('keeps the old file when the save fails', async () => {
    const { container } = render(
      <VehicleForm vehicle={vehicle} onSave={vi.fn(async () => false)} onCancel={vi.fn()} />,
    );
    click('remove');
    await submit(container);
    expect(deleteVehicleImage).not.toHaveBeenCalled();
  });

  it('drops unsaved uploads when replaced or cancelled, never the saved file', () => {
    const onCancel = vi.fn();
    render(<VehicleForm vehicle={vehicle} onSave={vi.fn()} onCancel={onCancel} />);
    click('upload-1');
    click('upload-2');
    expect(deleteVehicleImage).toHaveBeenCalledExactlyOnceWith(NEW_1);
    // The header back arrow is the form's first button
    fireEvent.click(document.body.querySelector('button[type="button"]')!);
    expect(onCancel).toHaveBeenCalled();
    expect(deleteVehicleImage).toHaveBeenLastCalledWith(NEW_2);
    expect(deleteVehicleImage).not.toHaveBeenCalledWith(OLD);
  });
});
