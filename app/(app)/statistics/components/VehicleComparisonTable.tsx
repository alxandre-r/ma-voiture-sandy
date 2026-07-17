'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { VEHICLE_LINE_COLORS } from '@/lib/utils/chartColors';
import { formatCurrency } from '@/lib/utils/format';

import type { Expense } from '@/types/expense';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

interface VehicleComparisonTableProps {
  expenses: Expense[];
  vehicles: (Vehicle | VehicleMinimal)[];
  vehicleIds: number[];
}

const CATEGORIES: { type: string; label: string }[] = [
  { type: 'fuel', label: 'Carburant' },
  { type: 'electric_charge', label: 'Recharge' },
  { type: 'maintenance', label: 'Entretien' },
  { type: 'insurance', label: 'Assurance' },
  { type: 'other', label: 'Autre' },
];

const FALLBACK_COLORS = VEHICLE_LINE_COLORS;

function getVehicleName(id: number, vehicles: (Vehicle | VehicleMinimal)[]): string {
  const v = vehicles.find((v) => v.vehicle_id === id);
  if (!v) return `Véhicule ${id}`;
  const full = v as Vehicle;
  return full.name ?? [full.make, full.model].filter(Boolean).join(' ') ?? `Véhicule ${id}`;
}

function getVehicleColor(
  id: number,
  index: number,
  vehicles: (Vehicle | VehicleMinimal)[],
): string {
  const v = vehicles.find((v) => v.vehicle_id === id);
  return (v as Vehicle)?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function VehicleComparisonTable({
  expenses,
  vehicles,
  vehicleIds,
}: VehicleComparisonTableProps) {
  if (vehicleIds.length < 2) return null;

  const totals: Record<number, Record<string, number>> = {};
  for (const id of vehicleIds) totals[id] = {};

  for (const e of expenses) {
    if (!vehicleIds.includes(e.vehicle_id)) continue;
    totals[e.vehicle_id][e.type] = (totals[e.vehicle_id][e.type] ?? 0) + e.amount;
  }

  const vehicleTotals = vehicleIds.map((id) =>
    Object.values(totals[id] ?? {}).reduce((s, v) => s + v, 0),
  );

  const activeCategories = CATEGORIES.filter((c) =>
    vehicleIds.some((id) => (totals[id]?.[c.type] ?? 0) > 0),
  );

  if (activeCategories.length === 0) return null;

  const minTotal = Math.min(...vehicleTotals);
  const maxTotal = Math.max(...vehicleTotals);
  const diffPct =
    vehicleIds.length === 2 && minTotal > 0
      ? Math.round(((maxTotal - minTotal) / minTotal) * 100)
      : 0;

  return (
    // overflow-hidden clips the tfoot background to the card's rounded corners
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Icon name="stack" size={18} className="text-gray-400 dark:text-gray-500" />
          <CardTitle>Comparatif véhicules</CardTitle>
        </div>
        {diffPct > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            écart <span className="font-semibold text-gray-600 dark:text-gray-300">{diffPct}%</span>
          </span>
        )}
      </CardHeader>

      {/* p-0 for full-bleed table; overflow-x-auto for narrow screens */}
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {/* px-6 aligns with CardHeader's p-6 */}
              <th className="text-left py-2.5 px-6 text-xs font-medium text-gray-400 dark:text-gray-500 w-1/3">
                Catégorie
              </th>
              {vehicleIds.map((id, i) => (
                <th key={id} className="text-right py-2.5 px-6">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                      {getVehicleName(id, vehicles)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getVehicleColor(id, i, vehicles) }}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activeCategories.map((cat) => {
              const rowAmounts = vehicleIds.map((id) => totals[id]?.[cat.type] ?? 0);
              const nonZero = rowAmounts.filter((a) => a > 0);
              const rowMin = nonZero.length > 1 ? Math.min(...nonZero) : -1;

              return (
                <tr
                  key={cat.type}
                  className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-6 text-gray-500 dark:text-gray-400">{cat.label}</td>
                  {vehicleIds.map((id) => {
                    const amount = totals[id]?.[cat.type] ?? 0;
                    const isBest = amount > 0 && amount === rowMin;

                    return (
                      <td key={id} className="py-3 px-6 text-right tabular-nums">
                        {amount > 0 ? (
                          <span
                            className={
                              isBest
                                ? 'font-semibold text-green-600 dark:text-green-400'
                                : 'text-gray-800 dark:text-gray-200'
                            }
                          >
                            {formatCurrency(amount)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <td className="py-3.5 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total
              </td>
              {vehicleIds.map((id, i) => {
                const total = vehicleTotals[i];
                const isCheapest = total === minTotal && total !== maxTotal;

                return (
                  <td key={id} className="py-3.5 px-6 text-right tabular-nums">
                    <span
                      className={`font-bold ${
                        isCheapest
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {formatCurrency(total)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
