'use client';

import { StatOverviewGrid } from '@/components/common/StatOverviewCard';

import type { StatCardDef } from '@/components/common/StatOverviewCard';
import type { PeriodSelection } from '@/types/period';

interface StatisticsOverviewProps {
  totalCost: number;
  fillsCount: number;
  annualProjection: number;
  monthsWithData?: number;
  previousPeriodCost?: number;
  previousYearTotal?: number;
  selectedPeriod?: PeriodSelection;
  totalKilometers?: number;
  costPerKm?: number;
  annualKmProjection?: number;
}

export default function StatisticsOverview({
  totalCost,
  fillsCount,
  annualProjection,
  monthsWithData,
  previousPeriodCost,
  previousYearTotal = 0,
  selectedPeriod = 'year' as const,
  totalKilometers = 0,
  costPerKm = 0,
  annualKmProjection = 0,
}: StatisticsOverviewProps) {
  const displayPeriodMonths =
    selectedPeriod === 'month' ? 1 : monthsWithData || (selectedPeriod === 'year' ? 12 : 12);

  const hasTrend = previousPeriodCost !== undefined && previousPeriodCost > 0;
  const trendPct = hasTrend ? ((totalCost - previousPeriodCost!) / previousPeriodCost!) * 100 : 0;

  const hasProjectionTrend = previousYearTotal > 0;
  const projTrendPct = hasProjectionTrend
    ? ((annualProjection - previousYearTotal) / previousYearTotal) * 100
    : 0;

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const cards: StatCardDef[] = [
    // Card 1 — Total expenses
    {
      key: 'cost',
      label: 'Dépenses totales',
      value: totalCost.toLocaleString('fr-FR'),
      unit: '€',
      trend: hasTrend ? `${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}%` : undefined,
      trendColor: trendPct > 0 ? 'text-red-500' : trendPct < 0 ? 'text-green-500' : 'text-gray-500',
      tooltip: {
        title: 'Dépenses totales',
        details: [
          ...(hasTrend
            ? [
                `Total : ${totalCost.toFixed(2)} €`,
                `Période précédente : ${previousPeriodCost?.toFixed(2)} €`,
                `Variation : ${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}%`,
              ]
            : [`Total : ${totalCost.toFixed(2)} €`, `Nombre de dépenses : ${fillsCount}`]),
          ...(costPerKm > 0
            ? [
                `Distance parcourue : ${totalKilometers.toLocaleString('fr-FR')} km`,
                `Coût au km : ~${costPerKm.toFixed(3).replace('.', ',')} €/km`,
              ]
            : []),
        ],
      },
    },

    // Card 2 — Monthly average (hidden for 'month' period)
    ...(selectedPeriod !== 'month'
      ? [
          {
            key: 'avg',
            label: 'Moyenne / mois',
            value: (totalCost / displayPeriodMonths).toFixed(0),
            unit: '€/mois',
            tooltip: {
              title: 'Moyenne mensuelle',
              details: [
                `Coût total : ${totalCost.toFixed(2)} €`,
                `Période : ${displayPeriodMonths} mois`,
                `Moyenne : ${(totalCost / displayPeriodMonths).toFixed(2)} €/mois`,
              ],
            },
          } satisfies StatCardDef,
        ]
      : []),

    // Card 3 — Annual projection
    {
      key: 'projection',
      label: `Projection ${currentYear}`,
      value: Math.round(annualProjection).toLocaleString('fr-FR'),
      unit: '€',
      trend: hasProjectionTrend
        ? `${projTrendPct > 0 ? '+' : ''}${projTrendPct.toFixed(1)}%`
        : undefined,
      trendColor:
        projTrendPct > 0 ? 'text-red-500' : projTrendPct < 0 ? 'text-green-500' : 'text-gray-500',
      tooltip: {
        title: `Projection (${currentYear})`,
        details: [
          `Moyenne mensuelle : ${(annualProjection / 12).toFixed(2)} €/mois`,
          `Projection : ${annualProjection.toFixed(2)} €`,
          ...(hasProjectionTrend
            ? [
                `${previousYear} (réel) : ${previousYearTotal.toFixed(2)} €`,
                `Variation : ${projTrendPct > 0 ? '+' : ''}${projTrendPct.toFixed(1)}%`,
              ]
            : []),
          ...(annualKmProjection > 0
            ? [`Distance projetée : ~${Math.round(annualKmProjection).toLocaleString('fr-FR')} km`]
            : []),
        ],
      },
    },

    // Card 4 — Cost per km (only when km data available)
    ...(costPerKm > 0
      ? [
          {
            key: 'efficiency',
            label: 'Coût au km',
            value: costPerKm.toFixed(2).replace('.', ','),
            unit: '€/km',
            tooltip: {
              title: 'Coût au kilomètre',
              details: [
                `Coût total : ${totalCost.toFixed(2)} €`,
                `Distance : ${totalKilometers.toLocaleString('fr-FR')} km`,
                `Coût au km : ${costPerKm.toFixed(3).replace('.', ',')} €/km`,
              ],
            },
          } satisfies StatCardDef,
        ]
      : []),
  ];

  return (
    <StatOverviewGrid
      data-tour="stats-overview"
      cards={cards}
      gridClass="grid-cols-2 md:grid-cols-4"
    />
  );
}
