import { describe, expect, it } from 'vitest';

import {
  defaultChargeType,
  fillInputError,
  fuelTypeLabel,
  isElectrified,
  normalizeFuelType,
  vehicleEnergy,
} from '@/lib/utils/vehicleEnergy';

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

describe('normalizeFuelType', () => {
  it.each([
    ['gasoline', 'gasoline'],
    ['plugin_hybrid', 'plugin_hybrid'],
    ['Essence', 'gasoline'],
    ['Diesel', 'diesel'],
    ['Hybride', 'hybrid'],
    ['Hybride non rechargeable', 'hybrid'],
    ['Hybride rechargeable', 'plugin_hybrid'],
    ['plug-in-hybrid', 'plugin_hybrid'],
    [' Électrique ', 'electric'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeFuelType(input)).toBe(expected);
  });

  it('returns null for empty and undefined for unknown values', () => {
    expect(normalizeFuelType(null)).toBeNull();
    expect(normalizeFuelType('')).toBeNull();
    expect(normalizeFuelType('GPL')).toBeUndefined();
    expect(normalizeFuelType(42)).toBeUndefined();
  });
});

describe('fuelTypeLabel', () => {
  it('labels codes and legacy labels in French', () => {
    expect(fuelTypeLabel('gasoline')).toBe('Essence');
    expect(fuelTypeLabel('plugin_hybrid')).toBe('Hybride rechargeable');
    expect(fuelTypeLabel('Électrique')).toBe('Électrique');
    expect(fuelTypeLabel('hybrid')).toBe('Hybride non rechargeable');
  });

  it('returns null when empty, and the raw value when unknown', () => {
    expect(fuelTypeLabel(null)).toBeNull();
    expect(fuelTypeLabel('GPL')).toBe('GPL');
  });
});

describe('isElectrified', () => {
  it('is true for every hybrid and EV', () => {
    expect(isElectrified('hybrid')).toBe(true);
    expect(isElectrified('plugin_hybrid')).toBe(true);
    expect(isElectrified('electric')).toBe(true);
    expect(isElectrified('diesel')).toBe(false);
    expect(isElectrified(null)).toBe(false);
  });
});
