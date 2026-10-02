'use client';

import { StatOverviewGrid } from '@/components/common/StatOverviewCard';
import { formatInsuranceDate } from '@/lib/utils/insuranceUtils';

import type { StatCardDef } from '@/components/common/StatOverviewCard';

interface InsuranceStatsGridProps {
  totalMonthlyPremium: number;
  insuredCount: number;
  activeVehicleCount: number;
  nextPayment: { date: string; vehicleName: string } | null;
}

/** Summary stats over the user's own vehicles in service. */
export default function InsuranceStatsGrid({
  totalMonthlyPremium,
  insuredCount,
  activeVehicleCount,
  nextPayment,
}: InsuranceStatsGridProps) {
  const cards: StatCardDef[] = [
    {
      key: 'premium',
      label: 'Prime mensuelle',
      value: totalMonthlyPremium.toFixed(2),
      unit: '€',
      subtitle:
        totalMonthlyPremium > 0 ? `${(totalMonthlyPremium * 12).toFixed(0)} €/an` : undefined,
    },
    {
      key: 'insured',
      label: 'Véhicules assurés',
      value: `${insuredCount}/${activeVehicleCount}`,
    },
    {
      key: 'next-payment',
      label: 'Prochaine mensualité',
      value: nextPayment ? formatInsuranceDate(nextPayment.date) : '—',
      subtitle: nextPayment?.vehicleName,
    },
  ];

  return <StatOverviewGrid cards={cards} gridClass="grid-cols-2 sm:grid-cols-3" />;
}
