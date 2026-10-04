import { describe, expect, it } from 'vitest';

import {
  check,
  firstError,
  isId,
  isIsoDate,
  isNonNegativeNumber,
  isOneOf,
  isOptionalText,
  isPositiveNumber,
  isText,
  isUuid,
  optional,
  readJsonObject,
} from '@/lib/validation/body';
import { expenseBaseError, fillFieldsError } from '@/lib/validation/expense';

const req = (body: string) =>
  new Request('http://localhost', { method: 'POST', body, headers: { 'content-type': 'application/json' } });

describe('readJsonObject', () => {
  it('returns the object', async () => {
    expect(await readJsonObject(req('{"a":1}'))).toEqual({ a: 1 });
  });
  it.each(['not json', '[1]', '42', 'null', '"x"'])('returns null for %s', async (raw) => {
    expect(await readJsonObject(req(raw))).toBeNull();
  });
});

describe('predicates', () => {
  it('isId accepts positive integers, as numbers or digit strings', () => {
    for (const ok of [1, 42, '7']) expect(isId(ok)).toBe(true);
    for (const bad of [0, -1, 1.5, '1a', '', null, undefined, NaN, '1e3x']) expect(isId(bad)).toBe(false);
  });

  it('numbers reject NaN, Infinity and non-numeric strings', () => {
    expect(isPositiveNumber('12.5')).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isNonNegativeNumber(0)).toBe(true);
    for (const bad of [NaN, Infinity, 'abc', '', null, {}]) {
      expect(isPositiveNumber(bad)).toBe(false);
      expect(isNonNegativeNumber(bad)).toBe(false);
    }
  });

  it('isIsoDate requires a real calendar date', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-28T10:00:00Z')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '28/02/2026', '', 20260228]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });

  it('text, enums and uuids', () => {
    expect(isText(' a ', 3)).toBe(true);
    expect(isText('   ', 3)).toBe(false);
    expect(isText('abcd', 3)).toBe(false);
    expect(isOptionalText(null, 3)).toBe(true);
    expect(isOptionalText(5, 3)).toBe(false);
    expect(isOneOf('read', ['read', 'write'] as const)).toBe(true);
    expect(isOneOf('admin', ['read', 'write'] as const)).toBe(false);
    expect(isUuid('7942485e-83e7-4755-849a-fa4e7b99b47d')).toBe(true);
    expect(isUuid('7942485e')).toBe(false);
  });

  it('optional() lets blank values through', () => {
    const optId = optional(isId);
    expect(optId(undefined)).toBe(true);
    expect(optId('')).toBe(true);
    expect(optId('x')).toBe(false);
  });

  it('firstError keeps the first failing message', () => {
    expect(firstError(check(true, 'a'), check(false, 'b'), check(false, 'c'))).toBe('b');
    expect(firstError(check(true, 'a'))).toBeNull();
  });
});

describe('expense checks', () => {
  it('requires a valid date and caps notes', () => {
    expect(expenseBaseError({ date: '2026-10-04' })).toBeNull();
    expect(expenseBaseError({})).toBe('Veuillez entrer une date valide');
    expect(expenseBaseError({ date: '2026-10-04', notes: 'x'.repeat(1001) })).toMatch(/notes/);
  });

  it('rejects negative or non-numeric quantities and unknown charge types', () => {
    expect(fillFieldsError({ liters: 40, price_per_liter: '1.8', kwh: null })).toBeNull();
    expect(fillFieldsError({ liters: -1 })).toMatch(/litres/);
    expect(fillFieldsError({ price_per_kwh: 'abc' })).toMatch(/kWh/);
    expect(fillFieldsError({ charge_type: 'diesel' })).toBe('Type de plein invalide');
  });
});
