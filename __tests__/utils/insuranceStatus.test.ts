import { describe, expect, it } from 'vitest';

import {
  getContractStatus,
  getHasActiveInsurance,
  getInsuranceBadge,
  getNextPaymentDate,
  getVehicleInsuranceStatus,
} from '@/lib/utils/insuranceUtils';

import type { VehicleInsuranceStatus } from '@/lib/utils/insuranceUtils';
import type { InsuranceContract } from '@/types/insurance';

const TODAY = '2026-10-02';
let nextId = 1;
const c = (o: Partial<InsuranceContract>): InsuranceContract => ({
  id: nextId++,
  vehicle_id: 1,
  owner_id: 'u1',
  monthly_cost: 50,
  start_date: '2025-01-01',
  end_date: null,
  provider: 'MAIF',
  ...o,
});

describe('getContractStatus', () => {
  it.each([
    [{ start_date: TODAY }, 'active'],
    [{ start_date: '2026-10-03' }, 'upcoming'],
    [{ end_date: TODAY }, 'active'],
    [{ end_date: '2026-10-01' }, 'ended'],
    [{ end_date: null }, 'active'],
  ])('%o → %s', (o, expected) => {
    expect(getContractStatus(c(o), TODAY)).toBe(expected);
  });
});

describe('getVehicleInsuranceStatus', () => {
  it('is uninsured without contracts', () => {
    expect(getVehicleInsuranceStatus([], TODAY)).toMatchObject({
      state: 'uninsured',
      current: null,
      upcoming: null,
    });
  });

  it('does not treat a future contract as current', () => {
    const future = c({ start_date: '2026-11-01' });
    const s = getVehicleInsuranceStatus([future], TODAY);
    expect(s.state).toBe('upcoming_only');
    expect(s.current).toBeNull();
    expect(s.upcoming).toBe(future);
  });

  it('keeps the running contract current when a renewal is scheduled', () => {
    const running = c({ start_date: '2025-01-01', end_date: '2026-10-31' });
    const next = c({ start_date: '2026-11-01' });
    const s = getVehicleInsuranceStatus([next, running], TODAY);
    expect(s.current).toBe(running);
    expect(s.upcoming).toBe(next);
    expect(s.state).toBe('insured'); // taken over the day after → not "expiring"
  });

  it('is expiring within 30 days without a successor', () => {
    const s = getVehicleInsuranceStatus([c({ end_date: '2026-10-20' })], TODAY);
    expect(s.state).toBe('expiring');
    expect(s.daysUntilEnd).toBe(18);
  });

  it('is insured, not expiring, when the contract ends today and the successor starts tomorrow', () => {
    const s = getVehicleInsuranceStatus(
      [c({ end_date: TODAY }), c({ start_date: '2026-10-03' })],
      TODAY,
    );
    expect(s.state).toBe('insured');
  });

  it('is uninsured when every contract ended', () => {
    expect(getVehicleInsuranceStatus([c({ end_date: '2026-09-30' })], TODAY).state).toBe(
      'uninsured',
    );
  });
});

describe('getHasActiveInsurance', () => {
  const insurance = {
    contracts: [c({ vehicle_id: 1 }), c({ vehicle_id: 2, end_date: '2026-01-01' })],
    hiddenVehicleIds: [3],
  };
  it('is true when covered, false when not', () => {
    expect(getHasActiveInsurance(insurance, { vehicle_id: 1, status: 'active' }, TODAY)).toBe(true);
    expect(getHasActiveInsurance(insurance, { vehicle_id: 2, status: null }, TODAY)).toBe(false);
  });
  it('is undefined for hidden or sold vehicles', () => {
    expect(getHasActiveInsurance(insurance, { vehicle_id: 3, status: 'active' }, TODAY)).toBe(
      undefined,
    );
    expect(getHasActiveInsurance(insurance, { vehicle_id: 2, status: 'sold' }, TODAY)).toBe(
      undefined,
    );
  });
});

describe('getNextPaymentDate', () => {
  it('returns the next instalment on or after today', () => {
    expect(getNextPaymentDate(c({ start_date: '2025-03-15' }), TODAY)).toBe('2026-10-15');
    expect(getNextPaymentDate(c({ start_date: '2025-03-02' }), TODAY)).toBe('2026-10-02');
  });
  it('clamps day 31 to the month length', () => {
    expect(getNextPaymentDate(c({ start_date: '2026-01-31' }), '2026-02-10')).toBe('2026-02-28');
  });
  it('returns the start date for an upcoming contract', () => {
    expect(getNextPaymentDate(c({ start_date: '2026-11-05' }), TODAY)).toBe('2026-11-05');
  });
  it('returns null when the next instalment falls after the end date', () => {
    expect(getNextPaymentDate(c({ start_date: '2025-03-15', end_date: '2026-10-10' }), TODAY)).toBe(
      null,
    );
  });
});

describe('getInsuranceBadge', () => {
  const s = (o: Partial<VehicleInsuranceStatus>): VehicleInsuranceStatus => ({
    state: 'uninsured',
    current: null,
    upcoming: null,
    daysUntilEnd: null,
    ...o,
  });
  it('labels each state', () => {
    expect(getInsuranceBadge(s({ state: 'insured' }), true)).toEqual({
      label: 'Assuré',
      tone: 'success',
    });
    expect(
      getInsuranceBadge(s({ state: 'insured', upcoming: c({ start_date: '2026-11-01' }) }), true),
    ).toEqual({ label: 'Changement le 01 nov. 2026', tone: 'info' });
    expect(getInsuranceBadge(s({ state: 'expiring', daysUntilEnd: 5 }), true)).toEqual({
      label: 'Expire dans 5 j',
      tone: 'warning',
    });
    expect(getInsuranceBadge(s({ state: 'expiring', daysUntilEnd: 0 }), true)).toEqual({
      label: "Expire aujourd'hui",
      tone: 'warning',
    });
    expect(
      getInsuranceBadge(
        s({ state: 'upcoming_only', upcoming: c({ start_date: '2026-11-01' }) }),
        true,
      ),
    ).toEqual({ label: 'À partir du 01 nov. 2026', tone: 'info' });
    expect(getInsuranceBadge(s({ state: 'uninsured' }), true)).toEqual({
      label: 'Non assuré',
      tone: 'danger',
    });
    expect(getInsuranceBadge(s({ state: 'uninsured' }), false)).toEqual({
      label: 'Non assuré',
      tone: 'neutral',
    });
  });
});
