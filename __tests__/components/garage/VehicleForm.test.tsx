import { act, fireEvent, render } from '@testing-library/react';
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

  it('submits the code and locks an EV to automatic', async () => {
    const onSave = vi.fn();
    const { container } = render(<VehicleForm onSave={onSave} onCancel={vi.fn()} />);
    fillRequired(container);
    fireEvent.change(select(container, 'fuel_type'), { target: { value: 'electric' } });
    expect(select(container, 'transmission').disabled).toBe(true);
    // handleSubmit awaits onSave, so let its state updates settle inside act
    await act(async () => {
      fireEvent.submit(container.querySelector('form#vehicle-form')!);
    });
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

describe('VehicleForm nullable numbers (B16)', () => {
  const input = (container: HTMLElement, name: string) =>
    container.querySelector(`input[name="${name}"]`) as HTMLInputElement;

  it('sends null for cleared year, purchase price and CO2 so the update clears them', async () => {
    const onSave = vi.fn();
    const vehicle = {
      vehicle_id: 7,
      make: 'Renault',
      model: 'Zoe',
      year: 2019,
      purchase_price: 15000,
      co2_emission: 0,
    } as Vehicle;
    const { container } = render(
      <VehicleForm vehicle={vehicle} onSave={onSave} onCancel={vi.fn()} />,
    );
    // A 0 g/km EV keeps its value instead of showing an empty field
    expect(input(container, 'co2_emission').value).toBe('0');
    for (const name of ['year', 'purchase_price', 'co2_emission']) {
      fireEvent.change(input(container, name), { target: { value: '' } });
    }
    // handleSubmit awaits onSave, so let its state updates settle inside act
    await act(async () => {
      fireEvent.submit(container.querySelector('form#vehicle-form')!);
    });
    const [payload] = onSave.mock.calls[0];
    expect(payload).toMatchObject({ year: null, purchase_price: null, co2_emission: null });
    expect(JSON.parse(JSON.stringify(payload))).toMatchObject({
      year: null,
      purchase_price: null,
      co2_emission: null,
    });
  });

  it('shows an empty year for a vehicle saved without one', () => {
    const vehicle = { vehicle_id: 7, make: 'Renault', model: 'Zoe', year: null } as Vehicle;
    const { container } = render(
      <VehicleForm vehicle={vehicle} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(input(container, 'year').value).toBe('');
  });
});
