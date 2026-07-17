'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { StatOverviewGrid } from '@/components/common/StatOverviewCard';

import type { StatCardDef } from '@/components/common/StatOverviewCard';
import type { InsuranceContract } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

interface InsuranceStatsGridProps {
  loading: boolean;
  totalMonthlyPremium: number;
  vehiclesInsuredCount: number;
  totalVehicleCount: number;
  nextPaymentEntry: { contract: InsuranceContract; date: Date } | null;
  nextPaymentVehicle: Vehicle | null;
}

export default function InsuranceStatsGrid({
  loading,
  totalMonthlyPremium,
  nextPaymentEntry,
  nextPaymentVehicle,
}: InsuranceStatsGridProps) {
  const annualPremium = totalMonthlyPremium * 12;

  const nextPaymentLabel = nextPaymentEntry
    ? format(nextPaymentEntry.date, 'dd MMM yyyy', { locale: fr })
    : '—';

  const nextVehicleName =
    nextPaymentVehicle
      ? `${nextPaymentVehicle.make ?? ''} ${nextPaymentVehicle.model ?? ''}`.trim()
      : undefined;

  const cards: StatCardDef[] = [
    {
      key: 'premium',
      label: 'Prime mensuelle',
      value: loading ? '—' : totalMonthlyPremium.toFixed(2),
      unit: loading ? undefined : '€',
      subtitle:
        !loading && totalMonthlyPremium > 0 ? `${annualPremium.toFixed(0)} €/an` : undefined,
    },
    {
      key: 'next-payment',
      label: 'Prochaine mensualité',
      value: loading ? '—' : nextPaymentLabel,
      subtitle: !loading && nextVehicleName ? nextVehicleName : undefined,
    },
  ];

  return <StatOverviewGrid cards={cards} gridClass="grid-cols-2" />;
}
