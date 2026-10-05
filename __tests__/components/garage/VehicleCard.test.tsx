import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VehicleCard from '@/app/(app)/garage/components/cards/VehicleCard';

import type { Vehicle } from '@/types/vehicle';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/components/user/ProfilePicture', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));

const vehicle = {
  vehicle_id: 7,
  name: 'Clio',
  make: 'Renault',
  model: 'Clio',
  odometer: 42000,
  fuel_type: 'gasoline',
} as Vehicle;

describe('VehicleCard odometer', () => {
  it('opens the inline editor from a keyboard-reachable button, without opening the card', () => {
    const onClick = vi.fn();
    render(<VehicleCard vehicle={vehicle} onClick={onClick} onOdometerUpdate={vi.fn()} />);

    const button = screen.getByRole('button', { name: /Modifier le kilométrage/ });
    fireEvent.click(button);

    expect(screen.getByRole('spinbutton')).toHaveValue(42000);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows the odometer as plain text when it cannot be edited', () => {
    render(<VehicleCard vehicle={vehicle} onClick={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Modifier le kilométrage/ })).toBeNull();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
