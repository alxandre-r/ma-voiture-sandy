import { describe, expect, it } from 'vitest';

import { defaultChargeType, fillInputError, vehicleEnergy } from '@/lib/utils/vehicleEnergy';

describe('vehicleEnergy', () => {
  it.each([
    ['gasoline', { fuel: true, electric: false }],
    ['diesel', { fuel: true, electric: false }],
    ['hybrid', { fuel: true, electric: false }],
    ['plugin_hybrid', { fuel: true, electric: true }],
    ['electric', { fuel: false, electric: true }],
    ['Essence', { fuel: true, electric: false }],
    ['Diesel', { fuel: true, electric: false }],
    ['Hybride non rechargeable', { fuel: true, electric: false }],
    ['Hybride', { fuel: true, electric: false }],
    ['Hybride rechargeable', { fuel: true, electric: true }],
    ['Électrique', { fuel: false, electric: true }],
  ])('%s', (fuelType, expected) => {
    expect(vehicleEnergy(fuelType)).toEqual(expected);
  });

  it('allows both energies when the fuel type is unknown', () => {
    expect(vehicleEnergy(null)).toEqual({ fuel: true, electric: true });
    expect(vehicleEnergy(undefined)).toEqual({ fuel: true, electric: true });
    expect(vehicleEnergy('')).toEqual({ fuel: true, electric: true });
  });

  it('treats an unrecognised value as a fuel vehicle', () => {
    expect(vehicleEnergy('GPL')).toEqual({ fuel: true, electric: false });
  });

  it('rejects an energy the vehicle cannot use, and non-positive amounts', () => {
    expect(fillInputError('gasoline', 'charge', 30)).toMatch(/recharges/);
    expect(fillInputError('Électrique', 'fill', 30)).toMatch(/pleins/);
    expect(fillInputError('Hybride rechargeable', 'charge', 30)).toBeNull();
    expect(fillInputError('Hybride rechargeable', 'fill', '45.5')).toBeNull();
    expect(fillInputError(null, 'charge', 12)).toBeNull();
    expect(fillInputError('diesel', 'fill', 0)).toBe('Veuillez entrer un montant valide');
    expect(fillInputError('diesel', 'fill', -5)).toBe('Veuillez entrer un montant valide');
    expect(fillInputError('diesel', 'fill', 'abc')).toBe('Veuillez entrer un montant valide');
    expect(fillInputError('diesel', 'fill', null)).toBe('Veuillez entrer un montant valide');
  });

  it('defaults to a charge only for pure EVs', () => {
    expect(defaultChargeType('Électrique')).toBe('charge');
    expect(defaultChargeType('electric')).toBe('charge');
    expect(defaultChargeType('Hybride rechargeable')).toBe('fill');
    expect(defaultChargeType(null)).toBe('fill');
  });
});
