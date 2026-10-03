import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));

import InsuranceSection from '@/app/(app)/garage/components/InsuranceSection';

import type { InsuranceContract } from '@/types/insurance';

const contract = (o: Partial<InsuranceContract>): InsuranceContract => ({
  id: 1,
  vehicle_id: 7,
  owner_id: 'me',
  monthly_cost: 40,
  start_date: '2020-01-01',
  end_date: null,
  provider: 'MAIF',
  ...o,
});

describe('InsuranceSection', () => {
  it('shows the current contract without fetching', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<InsuranceSection vehicleId={7} contracts={[contract({})]} vehicleActive />);
    expect(screen.getByText('Assuré')).toBeTruthy();
    expect(screen.getByText('MAIF')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Gérer/ }).getAttribute('href')).toBe(
      '/insurance?vehicleId=7',
    );
  });

  it('does not count a future contract as current', () => {
    render(
      <InsuranceSection
        vehicleId={7}
        contracts={[contract({ start_date: '2999-01-01' })]}
        vehicleActive
      />,
    );
    expect(screen.getByText(/^À partir du/)).toBeTruthy();
    expect(screen.queryByText('Assuré')).toBeNull();
  });

  it('hides the manage link for family vehicles', () => {
    render(<InsuranceSection vehicleId={7} contracts={[]} vehicleActive isFamilyVehicle />);
    expect(screen.getByText('Non assuré')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
