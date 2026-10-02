'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import InsuranceStatusBadge from '@/components/insurance/InsuranceStatusBadge';
import { formatCurrency } from '@/lib/utils/format';
import { formatInsuranceDate, getVehicleInsuranceStatus } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';

import type { InsuranceContract } from '@/types/insurance';

interface InsuranceSectionProps {
  vehicleId: number;
  /** Contracts of this vehicle (SSR, same source as the health score) */
  contracts: InsuranceContract[];
  vehicleActive: boolean;
  isFamilyVehicle?: boolean;
}

export default function InsuranceSection({
  vehicleId,
  contracts,
  vehicleActive,
  isFamilyVehicle,
}: InsuranceSectionProps) {
  const status = getVehicleInsuranceStatus(contracts, getLocalToday());
  const shown = status.current ?? status.upcoming;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="secure" size={16} className="text-gray-500" />
            Assurance
          </CardTitle>
          <div className="flex items-center gap-3">
            <InsuranceStatusBadge status={status} vehicleActive={vehicleActive} />
            {!isFamilyVehicle && (
              <Link
                href={`/insurance?vehicleId=${vehicleId}`}
                className="text-xs text-custom-2 hover:underline"
              >
                Gérer →
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {shown ? (
          <>
            {shown.provider && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {shown.provider}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(shown.monthly_cost)}/mois
            </p>
            {status.current?.end_date && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Jusqu&apos;au {formatInsuranceDate(status.current.end_date)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun contrat en cours</p>
        )}
      </CardContent>
    </Card>
  );
}
