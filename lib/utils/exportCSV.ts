import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { getCategoryLabel } from '@/lib/utils/expensesUtils';

import type { Expense } from '@/types/expense';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

const HEADERS = [
  'Date',
  'Véhicule',
  'Catégorie',
  'Montant (€)',
  'Kilométrage',
  'Quantité',
  'Unité',
  'Prix unitaire (€)',
  'Notes',
];

function getVehicleName(vehicleId: number, vehicles: (Vehicle | VehicleMinimal)[]): string {
  const v = vehicles.find((v) => v.vehicle_id === vehicleId);
  if (!v) return String(vehicleId);
  const full = v as Vehicle;
  return full.name ?? [full.make, full.model].filter(Boolean).join(' ') ?? String(vehicleId);
}

/** French decimal format (comma), or an empty cell when the value is missing. */
function frNumber(value: number | null | undefined, digits: number): string {
  return value == null ? '' : value.toFixed(digits).replace('.', ',');
}

/** Quantity, unit and unit price of a fill or charge; empty cells for other expenses. */
function energyCells(e: Expense): [string, string, string] {
  // A charge row also carries liters null and price_per_liter 0: read only its own fields.
  if (e.type === 'fuel') {
    return [frNumber(e.liters, 2), 'L', frNumber(e.price_per_liter, 3)];
  }
  if (e.type === 'electric_charge') {
    return [frNumber(e.kwh, 2), 'kWh', frNumber(e.price_per_kwh, 3)];
  }
  return ['', '', ''];
}

function escape(cell: string): string {
  return cell.includes(';') || cell.includes('"') || cell.includes('\n')
    ? `"${cell.replace(/"/g, '""')}"`
    : cell;
}

/** CSV content (with UTF-8 BOM for Excel, `;` separator) of the given expenses. */
export function buildExpensesCSV(
  expenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
): string {
  const rows = expenses.map((e) => [
    format(new Date(e.date), 'dd/MM/yyyy', { locale: fr }),
    getVehicleName(e.vehicle_id, vehicles),
    getCategoryLabel(e),
    frNumber(e.amount, 2),
    e.odometer == null ? '' : String(e.odometer),
    ...energyCells(e),
    e.notes ?? '',
  ]);

  return '﻿' + [HEADERS, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
}

export function exportExpensesCSV(
  expenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
): void {
  const csv = buildExpensesCSV(expenses, vehicles);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `depenses-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
