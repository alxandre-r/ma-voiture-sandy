import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));

import InsuranceVehicleCard from '@/app/(app)/insurance/components/InsuranceVehicleCard';

import type { InsuranceContract } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

const TODAY = '2026-10-02';
const vehicle = {
  vehicle_id: 1,
  make: 'Peugeot',
  model: '308',
  plate: 'AB-123-CD',
  status: 'active',
  last_fill_date: null,
} as Vehicle;
const k = (id: number, o: Partial<InsuranceContract>): InsuranceContract => ({
  id,
  vehicle_id: 1,
  owner_id: 'me',
  monthly_cost: 60,
  start_date: '2025-01-01',
  end_date: null,
  provider: 'MAIF',
  ...o,
});

describe('InsuranceVehicleCard', () => {
  it('shows the add action for a vehicle without contract', () => {
    const onAdd = vi.fn();
    render(<InsuranceVehicleCard vehicle={vehicle} contracts={[]} today={TODAY} onAdd={onAdd} />);
    expect(screen.getByText('Non assuré')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un contrat/ }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows the current contract and a scheduled change', () => {
    const contracts = [
      k(2, { start_date: '2026-11-01', monthly_cost: 65 }),
      k(1, { end_date: '2026-10-31', monthly_cost: 62.4 }),
    ];
    render(
      <InsuranceVehicleCard
        vehicle={vehicle}
        contracts={contracts}
        today={TODAY}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/^Changement le/)).toBeTruthy();
    expect(screen.getByText('62.40 €')).toBeTruthy();
    expect(screen.getByText('Changement déjà programmé')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Changer de contrat/ })).toBeNull();
  });

  it('lists every contract in the timeline, ended ones included', () => {
    const onEdit = vi.fn();
    const ended = k(1, { end_date: '2026-03-31', provider: 'Groupama' });
    render(
      <InsuranceVehicleCard
        vehicle={vehicle}
        contracts={[ended]}
        today={TODAY}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Contrats \(1\)/ }));
    expect(screen.getByText('Terminé')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier le contrat Groupama' }));
    expect(onEdit).toHaveBeenCalledWith(ended);
  });

  it('is read-only for family vehicles', () => {
    render(
      <InsuranceVehicleCard
        vehicle={vehicle}
        contracts={[k(1, {})]}
        today={TODAY}
        readOnly
        defaultExpanded
      />,
    );
    expect(screen.queryByRole('button', { name: /Changer de contrat/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Modifier/ })).toBeNull();
  });

  it('shows a placeholder when the owner hides insurance', () => {
    render(<InsuranceVehicleCard vehicle={vehicle} contracts={[]} today={TODAY} readOnly hidden />);
    expect(screen.getByText("Informations d'assurance masquées par le propriétaire")).toBeTruthy();
  });
});
