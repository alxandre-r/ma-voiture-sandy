'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import { useSelectors } from '@/contexts/SelectorsContext';
import { isVehicleSelected } from '@/lib/utils/filterUtils';
import { formatDate } from '@/lib/utils/format';
import { getHasActiveInsurance } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';
import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import type { ConsumptionAnomaly } from '@/lib/utils/anomalyUtils';
import type { Expense } from '@/types/expense';
import type { InsuranceData } from '@/types/insurance';
import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

interface InsightItem {
  key: string;
  vehicleName: string;
  label: string;
  detail: string;
  recommendation: string;
  status: 'critical' | 'warning';
  href: string;
}

const FACTOR_LINKS: Record<string, string> = {
  'Contrôle technique': '/garage',
  Assurance: '/insurance',
  'Rappels en retard': '/reminders',
  'Rappels imminents': '/reminders',
  'Entretien récent': '/maintenance',
  'Activité récente': '/expenses',
  'Consommation inhabituelle': '/expenses',
};

interface InsightsPanelProps {
  vehicles: Vehicle[];
  reminders: Reminder[];
  expenses: Expense[];
  insurance?: InsuranceData;
  anomalies?: ConsumptionAnomaly[];
}

export default function InsightsPanel({
  vehicles,
  reminders,
  expenses,
  insurance,
  anomalies = [],
}: InsightsPanelProps) {
  const { selectedVehicleIds } = useSelectors();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const filteredVehicles = useMemo(
    () => vehicles.filter((v) => isVehicleSelected(selectedVehicleIds, v.vehicle_id)),
    [vehicles, selectedVehicleIds],
  );

  const insights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];
    const today = getLocalToday();

    // ── Health score factors ──────────────────────────────────────────────────
    for (const vehicle of filteredVehicles) {
      const hasActiveInsurance = insurance
        ? getHasActiveInsurance(insurance, vehicle, today)
        : undefined;

      const { factors } = computeHealthScore(vehicle, {
        reminders,
        expenses,
        hasActiveInsurance,
      });

      for (const factor of factors) {
        if (
          (factor.status === 'critical' || factor.status === 'warning') &&
          factor.recommendation
        ) {
          items.push({
            key: `${vehicle.vehicle_id}-${factor.label}`,
            vehicleName: vehicle.name ?? `${vehicle.make} ${vehicle.model}`,
            label: factor.label,
            detail: factor.detail,
            recommendation: factor.recommendation,
            status: factor.status,
            href:
              factor.label === 'Assurance'
                ? `/insurance?vehicleId=${vehicle.vehicle_id}`
                : (FACTOR_LINKS[factor.label] ?? '/garage'),
          });
        }
      }
    }

    // ── Consumption anomalies ─────────────────────────────────────────────────
    const filteredAnomalies = anomalies.filter((a) =>
      isVehicleSelected(selectedVehicleIds, a.vehicleId),
    );
    for (const anomaly of filteredAnomalies) {
      const isUp = anomaly.direction === 'up';
      const absDeviation = Math.abs(anomaly.deviationPct);
      const isElectric = anomaly.energy === 'electric';
      const unit = isElectric ? 'kWh/100' : 'L/100';
      items.push({
        key: `anomaly-${anomaly.vehicleId}-${anomaly.energy}`,
        vehicleName: anomaly.vehicleName,
        label: 'Consommation inhabituelle',
        detail: `${anomaly.latestConsumption} ${unit} vs ${anomaly.baselineConsumption} ${unit} habituel (${isUp ? '+' : '−'}${absDeviation}%) · ${isElectric ? 'recharge' : 'plein'} du ${formatDate(anomaly.fillDate)}`,
        recommendation: isElectric
          ? "Consulter l'historique des recharges"
          : "Consulter l'historique des pleins",
        status: 'warning',
        href: FACTOR_LINKS['Consommation inhabituelle'],
      });
    }

    // Sort: critical first, then warning
    items.sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'critical' ? -1 : 1;
    });

    return items;
  }, [filteredVehicles, reminders, expenses, insurance, anomalies, selectedVehicleIds]);

  const visible = insights.filter((i) => !dismissed.has(i.key)).slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <div
      data-tour="dashboard-insights"
      className="rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 p-4 space-y-2"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon name="bell" size={15} className="text-orange-500" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {visible.length === 1 ? "1 point d'attention" : `${visible.length} points d'attention`}
        </p>
      </div>

      {visible.map((item) => (
        <div
          key={item.key}
          className="flex items-start gap-3 bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 border border-gray-100 dark:border-gray-800"
        >
          <span
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
              item.status === 'critical' ? 'bg-red-500' : 'bg-orange-400'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
              {item.vehicleName}{' '}
              <span className="font-normal text-gray-500 dark:text-gray-400">— {item.detail}</span>
            </p>
            <Link
              href={item.href}
              className="text-xs text-custom-1 hover:underline mt-0.5 inline-block"
            >
              {item.recommendation} →
            </Link>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, item.key]))}
            className="p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors shrink-0"
            title="Ignorer"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
