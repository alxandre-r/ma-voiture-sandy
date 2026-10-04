import { buildExpensesCSV } from '@/lib/utils/exportCSV';

import type { Expense } from '@/types/expense';
import type { Vehicle } from '@/types/vehicle';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 1,
    vehicle_id: 1,
    vehicle_name: null,
    owner_id: 'user-1',
    owner_name: null,
    type: 'other',
    amount: 10,
    date: '2026-03-15',
    notes: null,
    odometer: null,
    label: null,
    maintenance_type: null,
    maintenance_type_label: null,
    garage: null,
    ...overrides,
  };
}

const vehicles: Vehicle[] = [
  { vehicle_id: 1, name: 'Ma Zoé', make: 'Renault', model: 'Zoé', last_fill_date: null },
];

/** Rows of the CSV (header first), each split into cells. */
function parse(csv: string): string[][] {
  return csv
    .replace(/^﻿/, '')
    .split('\r\n')
    .map((line) => line.split(';'));
}

describe('buildExpensesCSV', () => {
  it('starts with a BOM and writes the headers with ; separators', () => {
    const csv = buildExpensesCSV([], vehicles);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(parse(csv)[0]).toEqual([
      'Date',
      'Véhicule',
      'Catégorie',
      'Montant (€)',
      'Kilométrage',
      'Quantité',
      'Unité',
      'Prix unitaire (€)',
      'Notes',
    ]);
  });

  it('writes odometer, liters, L and €/L for a fuel fill', () => {
    const fill = makeExpense({
      type: 'fuel',
      amount: 75.5,
      odometer: 123456,
      liters: 42.3,
      price_per_liter: 1.785,
      kwh: null,
      price_per_kwh: null,
      charge_type: 'fill',
      notes: 'Autoroute',
    });
    expect(parse(buildExpensesCSV([fill], vehicles))[1]).toEqual([
      expect.any(String),
      'Ma Zoé',
      'Carburant',
      '75,50',
      '123456',
      '42,30',
      'L',
      '1,785',
      'Autoroute',
    ]);
  });

  it('writes kWh and €/kWh for a charge, never its price_per_liter 0', () => {
    const charge = makeExpense({
      type: 'electric_charge',
      amount: 12.6,
      odometer: 20500,
      liters: null,
      price_per_liter: 0,
      kwh: 42,
      price_per_kwh: 0.3,
      charge_type: 'charge',
    });
    expect(parse(buildExpensesCSV([charge], vehicles))[1].slice(2)).toEqual([
      'Recharge',
      '12,60',
      '20500',
      '42,00',
      'kWh',
      '0,300',
      '',
    ]);
  });

  it('leaves the energy cells empty for a maintenance row', () => {
    const maintenance = makeExpense({
      type: 'maintenance',
      amount: 189,
      odometer: 60000,
      maintenance_type_label: 'Vidange',
    });
    expect(parse(buildExpensesCSV([maintenance], vehicles))[1].slice(2)).toEqual([
      'Vidange',
      '189,00',
      '60000',
      '',
      '',
      '',
      '',
    ]);
  });

  it('leaves the odometer empty when missing and quotes notes containing ;', () => {
    const other = makeExpense({ type: 'other', label: 'Péage', notes: 'A6; retour' });
    const csv = buildExpensesCSV([other], vehicles);
    expect(csv.split('\r\n')[1]).toMatch(/;Péage;10,00;;;;;"A6; retour"$/);
  });
});
