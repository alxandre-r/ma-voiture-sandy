import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/components/common/attachments/AttachmentSection', () => ({ default: () => null }));
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showError: vi.fn() }),
}));

import VehicleForm from '@/app/(app)/garage/components/forms/VehicleForm';

import type { Vehicle } from '@/types/vehicle';

const select = (container: HTMLElement, name: string) =>
  container.querySelector(`select[name="${name}"]`) as HTMLSelectElement;

function fillRequired(container: HTMLElement) {
  for (const [name, value] of [
    ['make', 'Renault'],
    ['model', 'Zoe'],
  ]) {
    const input = container.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
  }
}

describe('VehicleForm fuel type', () => {
  it('offers the DB codes with French labels', () => {
    const { container } = render(<VehicleForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const options = Array.from(select(container, 'fuel_type').options).map((o) => [
      o.value,
      o.textContent,
    ]);
    expect(options).toEqual([
      ['gasoline', 'Essence'],
      ['diesel', 'Diesel'],
      ['hybrid', 'Hybride non rechargeable'],
      ['plugin_hybrid', 'Hybride rechargeable'],
      ['electric', 'Électrique'],
    ]);
  });

  it('submits the code and locks an EV to automatic', () => {
    const onSave = vi.fn();
    const { container } = render(<VehicleForm onSave={onSave} onCancel={vi.fn()} />);
    fillRequired(container);
    fireEvent.change(select(container, 'fuel_type'), { target: { value: 'electric' } });
    expect(select(container, 'transmission').disabled).toBe(true);
    fireEvent.submit(container.querySelector('form#vehicle-form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fuel_type: 'electric', transmission: 'automatic' }),
      [],
    );
  });

  it('maps a legacy French label to its code when editing', () => {
    const vehicle = {
      vehicle_id: 7,
      name: 'Zoé',
      make: 'Renault',
      model: 'Zoe',
      fuel_type: 'Hybride rechargeable',
      transmission: 'manual',
    } as Vehicle;
    const { container } = render(
      <VehicleForm vehicle={vehicle} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(select(container, 'fuel_type').value).toBe('plugin_hybrid');
    expect(select(container, 'transmission').value).toBe('automatic');
  });
});
