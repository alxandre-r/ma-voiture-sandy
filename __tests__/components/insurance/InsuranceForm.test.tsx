import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/components/common/attachments/AttachmentSection', () => ({ default: () => null }));

import InsuranceForm from '@/app/(app)/insurance/components/InsuranceForm';

describe('InsuranceForm', () => {
  it('in change mode, labels the date "Date d\'effet" and explains the closing', () => {
    render(
      <InsuranceForm
        mode="change"
        defaultStartDate="2026-11-01"
        defaultProvider="MAIF"
        defaultMonthlyCost={62.4}
        currentContract={{ provider: 'MAIF', monthly_cost: 62.4 }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Date d'effet")).toBeTruthy();
    expect(screen.queryByText('Date de fin')).toBeNull();
    expect(screen.getByText(/prendra fin le 31 oct\.? 2026/)).toBeTruthy();
  });

  it("updates the closing hint when the date d'effet changes", () => {
    const { container } = render(
      <InsuranceForm
        mode="change"
        defaultStartDate="2026-11-01"
        currentContract={{ provider: 'MAIF', monthly_cost: 62.4 }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = container.querySelector('input[name="start_date"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-12-01' } });
    expect(screen.getByText(/prendra fin le 30 nov\.? 2026/)).toBeTruthy();
  });

  it('shows the end date in add mode and refuses a 0 € cost', () => {
    render(<InsuranceForm mode="add" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Date de fin')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ex : 65').getAttribute('min')).toBe('0.01');
  });

  it('submits the form values', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <InsuranceForm mode="add" defaultStartDate="2026-10-01" onSave={onSave} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText('Ex : 65'), { target: { value: '42.5' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      { provider: '', monthly_cost: 42.5, start_date: '2026-10-01', end_date: '' },
      [],
    );
  });

  it('does not claim a closing when the latest contract already ended (gap)', () => {
    render(
      <InsuranceForm
        mode="change"
        defaultStartDate="2026-11-15"
        currentContract={{ provider: 'MAIF', monthly_cost: 62.4, end_date: '2026-10-20' }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/prendra fin/)).toBeNull();
    expect(screen.getByText(/Aucune couverture du 21 oct\.? 2026 au 14 nov\.? 2026/)).toBeTruthy();
  });

  it('says nothing when the new contract starts right after the latest one', () => {
    render(
      <InsuranceForm
        mode="change"
        defaultStartDate="2026-10-21"
        currentContract={{ provider: 'MAIF', monthly_cost: 62.4, end_date: '2026-10-20' }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/prendra fin|Aucune couverture/)).toBeNull();
  });
});
