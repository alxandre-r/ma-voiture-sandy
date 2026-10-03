import { describe, expect, it } from 'vitest';

import {
  findOverlap,
  formatOverlapError,
  getInstalmentDates,
  getSuggestedEffectiveDate,
  INSURANCE_ERRORS,
  planContractChange,
  validateContractInput,
} from '@/lib/utils/insuranceUtils';

import type { InsuranceContract } from '@/types/insurance';

const c = (id: number, o: Partial<InsuranceContract>): InsuranceContract => ({
  id,
  vehicle_id: 1,
  owner_id: 'u1',
  monthly_cost: 50,
  start_date: '2025-01-01',
  end_date: null,
  provider: 'MAIF',
  ...o,
});

describe('validateContractInput', () => {
  it('accepts a valid contract', () => {
    expect(validateContractInput({ monthly_cost: 10, start_date: '2026-01-01', end_date: '' })).toBe(
      null,
    );
  });
  it.each([
    [{ monthly_cost: 0, start_date: '2026-01-01' }, INSURANCE_ERRORS.costRequired],
    [{ monthly_cost: -5, start_date: '2026-01-01' }, INSURANCE_ERRORS.costRequired],
    [{ monthly_cost: 'abc', start_date: '2026-01-01' }, INSURANCE_ERRORS.costRequired],
    [{ monthly_cost: 10, start_date: '' }, INSURANCE_ERRORS.startRequired],
    [
      { monthly_cost: 10, start_date: '2026-02-01', end_date: '2026-01-31' },
      INSURANCE_ERRORS.endBeforeStart,
    ],
  ])('%o → %s', (input, error) => {
    expect(validateContractInput(input)).toBe(error);
  });
});

describe('findOverlap', () => {
  const list = [
    c(1, { start_date: '2024-01-01', end_date: '2024-12-31' }),
    c(2, { start_date: '2025-01-01' }),
  ];
  it('detects an intersection with an open-ended contract', () => {
    expect(findOverlap(list, { start_date: '2030-01-01', end_date: null })?.id).toBe(2);
  });
  it('accepts an adjacent period', () => {
    expect(findOverlap([list[0]], { start_date: '2025-01-01', end_date: '2025-06-30' })).toBeNull();
  });
  it('ignores the excluded contract (editing itself)', () => {
    expect(findOverlap(list, { start_date: '2025-02-01', end_date: null }, 2)).toBeNull();
  });
  it('formats the overlap message', () => {
    expect(formatOverlapError({ start_date: '2025-01-01', end_date: null })).toMatch(
      /^Ce contrat chevauche le contrat du 01 .+ 2025 au —\.$/,
    );
  });
});

describe('getInstalmentDates', () => {
  it('lists monthly dates up to today', () => {
    expect(getInstalmentDates('2026-08-15', null, '2026-10-02')).toEqual([
      '2026-08-15',
      '2026-09-15',
    ]);
  });
  it('does not drift after a short month', () => {
    expect(getInstalmentDates('2026-01-31', null, '2026-04-29')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });
  it('stops at the end date and returns nothing for a future start', () => {
    expect(getInstalmentDates('2026-01-01', '2026-02-15', '2026-10-02')).toEqual([
      '2026-01-01',
      '2026-02-01',
    ]);
    expect(getInstalmentDates('2026-11-01', null, '2026-10-02')).toEqual([]);
  });
});

describe('planContractChange', () => {
  const input = { vehicle_id: 1, monthly_cost: 60, effective_date: '2026-11-01' };

  it('closes the open base the day before and creates an open contract', () => {
    const plan = planContractChange([c(1, { start_date: '2025-01-01' })], input);
    expect(plan).toEqual({
      ok: true,
      close: { id: 1, end_date: '2026-10-31' },
      create: {
        vehicle_id: 1,
        monthly_cost: 60,
        start_date: '2026-11-01',
        end_date: null,
        provider: 'MAIF',
      },
    });
  });

  it('shortens a base that ends after the effective date', () => {
    const plan = planContractChange([c(1, { end_date: '2027-06-30' })], input);
    expect(plan.ok && plan.close).toEqual({ id: 1, end_date: '2026-10-31' });
  });

  it('leaves an already-ended base untouched (gap allowed)', () => {
    const plan = planContractChange([c(1, { end_date: '2026-03-31' })], input);
    expect(plan.ok && plan.close).toBeNull();
  });

  it('uses the given provider, trimmed', () => {
    const plan = planContractChange([c(1, {})], { ...input, provider: '  AXA ' });
    expect(plan.ok && plan.create.provider).toBe('AXA');
  });

  it('creates without closing when the vehicle has no contract', () => {
    const plan = planContractChange([], input);
    expect(plan.ok && plan.close).toBeNull();
    expect(plan.ok && plan.create.provider).toBeNull();
  });

  it('rejects when a contract starts on or after the effective date', () => {
    expect(planContractChange([c(1, { start_date: '2026-11-01' })], input)).toEqual({
      ok: false,
      status: 409,
      error: INSURANCE_ERRORS.laterContractExists,
    });
  });

  it('validates cost and effective date', () => {
    expect(planContractChange([], { ...input, monthly_cost: 0 })).toMatchObject({
      ok: false,
      status: 400,
      error: INSURANCE_ERRORS.costRequired,
    });
    expect(planContractChange([], { ...input, effective_date: '' })).toMatchObject({
      ok: false,
      status: 400,
      error: INSURANCE_ERRORS.effectiveRequired,
    });
  });
});

describe('getSuggestedEffectiveDate', () => {
  it('is today without a future end date', () => {
    expect(getSuggestedEffectiveDate([c(1, {})], '2026-10-02')).toBe('2026-10-02');
  });
  it('is the day after a future end date of the latest contract', () => {
    expect(getSuggestedEffectiveDate([c(1, { end_date: '2026-12-31' })], '2026-10-02')).toBe(
      '2027-01-01',
    );
  });
});
