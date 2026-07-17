'use client';

import { StatOverviewGrid } from '@/components/common/StatOverviewCard';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

import type { StatCardDef } from '@/components/common/StatOverviewCard';
import type { Expense } from '@/types/expense';

interface StatsCardsProps {
  expenseCount: number;
  totalExpenses: number;
  prevTotalExpenses?: number | null;
  avgConsumption: number;
  prevAvgConsumption?: number | null;
  costPer100km?: number | null;
  lastFill?: Expense | null;
  onEditLastFill?: () => void;
}

function formatTrend(current: number, previous: number | null | undefined): { trend: string; trendColor: string } | null {
  if (previous == null || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 1) return null;
  const sign = delta > 0 ? '+' : '';
  return { trend: `${sign}${delta.toFixed(0)}%`, trendColor: '' };
}

export default function StatsCards({
  expenseCount,
  totalExpenses,
  prevTotalExpenses,
  avgConsumption,
  prevAvgConsumption,
  costPer100km,
  lastFill,
  onEditLastFill,
}: StatsCardsProps) {
  const expenseTrend = formatTrend(totalExpenses, prevTotalExpenses);
  const consumptionTrend = formatTrend(avgConsumption, prevAvgConsumption);

  const cards: StatCardDef[] = [
    // First card: coût/100km when distance data is available, otherwise expense count
    costPer100km != null
      ? {
          key: 'costPer100km',
          label: 'Coût / 100 km',
          value: costPer100km.toFixed(2),
          unit: '€',
        }
      : {
          key: 'count',
          label: 'Dépenses',
          value: expenseCount,
          unit: 'opér.',
        },
    {
      key: 'expenses',
      label: 'Total période',
      value: totalExpenses.toFixed(2),
      unit: '€',
      ...(expenseTrend
        ? {
            trend: expenseTrend.trend,
            trendColor: expenseTrend.trend.startsWith('+') ? 'text-red-500' : 'text-emerald-500',
          }
        : {}),
    },
    {
      key: 'consumption',
      label: 'Consommation moy.',
      value: avgConsumption > 0 ? avgConsumption.toFixed(1) : '—',
      unit: avgConsumption > 0 ? 'L/100' : undefined,
      ...(consumptionTrend
        ? {
            trend: consumptionTrend.trend,
            trendColor: consumptionTrend.trend.startsWith('+') ? 'text-red-500' : 'text-emerald-500',
          }
        : {}),
    },
  ];

  if (lastFill) {
    const isElectric = lastFill.type === 'electric_charge';
    const qty = isElectric
      ? lastFill.kwh != null
        ? `${lastFill.kwh.toFixed(1)} kWh`
        : null
      : lastFill.liters != null
        ? `${lastFill.liters.toFixed(1)} L`
        : null;
    const subtitle = [qty, formatCurrency(lastFill.amount)].filter(Boolean).join(' · ');

    cards.push({
      key: 'lastFill',
      label: isElectric ? 'Dernière recharge' : 'Dernier plein',
      value: formatDateShort(lastFill.date),
      subtitle,
      trend: 'Modifier',
      trendColor: 'text-custom-1',
      onClick: onEditLastFill,
    });
  }

  const gridClass =
    cards.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return <StatOverviewGrid cards={cards} gridClass={gridClass} />;
}
