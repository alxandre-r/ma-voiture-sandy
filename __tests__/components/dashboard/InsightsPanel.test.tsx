import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import InsightsPanel from '@/app/(app)/dashboard/components/InsightsPanel';

import type { ConsumptionAnomaly } from '@/lib/utils/anomalyUtils';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/contexts/SelectorsContext', () => ({
  useSelectors: () => ({ selectedVehicleIds: [1] }),
}));

function makeAnomaly(overrides: Partial<ConsumptionAnomaly>): ConsumptionAnomaly {
  return {
    vehicleId: 1,
    vehicleName: 'Ma voiture',
    vehicleColor: '#000',
    energy: 'fuel',
    latestConsumption: 9,
    baselineConsumption: 7,
    deviationPct: 28.6,
    direction: 'up',
    fillDate: '2026-03-15',
    possibleCauses: [],
    ...overrides,
  };
}

describe('InsightsPanel — consumption anomalies', () => {
  it('shows a fuel anomaly in L/100 with a link to the fills', () => {
    render(
      <InsightsPanel vehicles={[]} reminders={[]} expenses={[]} anomalies={[makeAnomaly({})]} />,
    );
    expect(screen.getByText(/9 L\/100 vs 7 L\/100 habituel \(\+28\.6%\) · plein du/)).toBeTruthy();
    expect(screen.getByText(/Consulter l'historique des pleins/)).toBeTruthy();
  });

  it('shows an EV anomaly in kWh/100 with a link to the charges', () => {
    const anomaly = makeAnomaly({
      energy: 'electric',
      latestConsumption: 26,
      baselineConsumption: 17,
      deviationPct: 52.9,
    });
    render(<InsightsPanel vehicles={[]} reminders={[]} expenses={[]} anomalies={[anomaly]} />);
    expect(
      screen.getByText(/26 kWh\/100 vs 17 kWh\/100 habituel \(\+52\.9%\) · recharge du/),
    ).toBeTruthy();
    expect(screen.getByText(/Consulter l'historique des recharges/)).toBeTruthy();
    expect(screen.queryByText(/L\/100 /)).toBeNull();
  });
});
