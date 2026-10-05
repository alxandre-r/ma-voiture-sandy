import { render } from '@testing-library/react';

import ContextBadge from '@/components/common/ContextBadge';

const selectors = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('@/contexts/SelectorsContext', () => ({
  useSelectors: () => selectors.value,
}));

const vehicles = [
  { vehicle_id: 1, name: 'Clio' },
  { vehicle_id: 2, name: 'Zoé' },
];

function renderWith(selectedVehicleIds: number[], selectedPeriod: string, periodLabel: string) {
  selectors.value = { vehicles, selectedVehicleIds, selectedPeriod, periodLabel };
  return render(<ContextBadge />);
}

describe('ContextBadge (B24)', () => {
  it('hides for all vehicles + the current month (label is lowercase)', () => {
    const { container } = renderWith([1, 2], 'month', 'ce mois');
    expect(container).toBeEmptyDOMElement();
  });

  it('hides for an empty selection (= all vehicles) + the current month', () => {
    const { container } = renderWith([], 'month', 'ce mois');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the period when it is not the current month', () => {
    const { container } = renderWith([1, 2], 'year', 'cette année');
    expect(container).toHaveTextContent('cette année');
  });

  it('shows the vehicle when only one is selected', () => {
    const { container } = renderWith([2], 'month', 'ce mois');
    expect(container).toHaveTextContent('Zoé · ce mois');
  });
});
