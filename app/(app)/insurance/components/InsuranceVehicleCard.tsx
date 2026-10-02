'use client';

import { useState } from 'react';

import Button from '@/components/common/ui/Button';
import { Card } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import InsuranceStatusBadge from '@/components/insurance/InsuranceStatusBadge';
import { formatCurrency } from '@/lib/utils/format';
import {
  formatInsuranceDate,
  getContractStatus,
  getVehicleInsuranceStatus,
  sortByStartDesc,
} from '@/lib/utils/insuranceUtils';

import type { ContractStatus } from '@/lib/utils/insuranceUtils';
import type { InsuranceContract } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

const CONTRACT_PILL: Record<ContractStatus, { label: string; className: string }> = {
  active: {
    label: 'Actif',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  upcoming: {
    label: 'À venir',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  },
  ended: {
    label: 'Terminé',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
};

export function vehicleDisplayName(vehicle: Vehicle): string {
  return (vehicle.name ?? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()) || 'Véhicule';
}

interface InsuranceVehicleCardProps {
  vehicle: Vehicle;
  /** Contracts of this vehicle only */
  contracts: InsuranceContract[];
  today: string;
  readOnly?: boolean;
  /** Family vehicle whose owner hides insurance */
  hidden?: boolean;
  defaultExpanded?: boolean;
  highlighted?: boolean;
  onAdd?: () => void;
  onChange?: () => void;
  onEdit?: (contract: InsuranceContract) => void;
  onDelete?: (contract: InsuranceContract) => void;
}

export default function InsuranceVehicleCard({
  vehicle,
  contracts,
  today,
  readOnly = false,
  hidden = false,
  defaultExpanded = false,
  highlighted = false,
  onAdd,
  onChange,
  onEdit,
  onDelete,
}: InsuranceVehicleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const name = vehicleDisplayName(vehicle);
  const vehicleActive = !vehicle.status || vehicle.status === 'active';

  const header = (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
      {vehicle.plate && <p className="text-xs text-gray-400 dark:text-gray-500">{vehicle.plate}</p>}
    </div>
  );

  if (hidden) {
    return (
      <Card className="p-4 space-y-1" id={`insurance-vehicle-${vehicle.vehicle_id}`}>
        {header}
        <p className="text-xs italic text-gray-400 dark:text-gray-500">
          Informations d&apos;assurance masquées par le propriétaire
        </p>
      </Card>
    );
  }

  const status = getVehicleInsuranceStatus(contracts, today);
  const shown = status.current ?? status.upcoming;
  const sorted = sortByStartDesc(contracts);

  return (
    <Card
      id={`insurance-vehicle-${vehicle.vehicle_id}`}
      className={`p-4 space-y-3 transition-shadow ${highlighted ? 'ring-2 ring-custom-1' : ''}`}
    >
      {/* Header: vehicle, badge, monthly cost */}
      <div className="flex items-start justify-between gap-3">
        {header}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <InsuranceStatusBadge status={status} vehicleActive={vehicleActive} />
          {shown && (
            <p className="text-sm font-bold text-custom-1 tabular-nums">
              {formatCurrency(shown.monthly_cost)}
              <span className="text-[11px] font-normal text-gray-400"> /mois</span>
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {shown
          ? [
              shown.provider,
              `${status.current ? 'depuis le' : 'à partir du'} ${formatInsuranceDate(shown.start_date)}`,
              `${Math.round(shown.monthly_cost * 12)} €/an`,
            ]
              .filter(Boolean)
              .join(' · ')
          : 'Aucun contrat en cours'}
      </p>

      {/* Toggle + primary action */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {sorted.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
          >
            <Icon
              name="arrow-down"
              size={12}
              className={`transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
            Contrats ({sorted.length})
          </button>
        ) : (
          <span />
        )}

        {!readOnly &&
          (sorted.length === 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onAdd}
              leftIcon={<Icon name="add" size={12} />}
            >
              Ajouter un contrat
            </Button>
          ) : status.upcoming ? (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Changement déjà programmé
            </span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={onChange}
              leftIcon={<Icon name="history" size={12} />}
            >
              Changer de contrat
            </Button>
          ))}
      </div>

      {/* Timeline */}
      {expanded && sorted.length > 0 && (
        <ul className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1">
          {sorted.map((contract, i) => {
            const older = sorted[i + 1];
            const delta = older ? contract.monthly_cost - older.monthly_cost : null;
            const pill = CONTRACT_PILL[getContractStatus(contract, today)];
            const label = contract.provider ?? 'sans assureur';
            return (
              <li key={contract.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${pill.className}`}
                >
                  {pill.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 dark:text-gray-300 truncate">
                    {contract.provider ?? '—'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {formatInsuranceDate(contract.start_date)} →{' '}
                    {formatInsuranceDate(contract.end_date)}
                  </p>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums shrink-0">
                  {formatCurrency(contract.monthly_cost)}
                </span>
                {delta !== null && delta !== 0 && (
                  <span
                    className={`tabular-nums shrink-0 ${delta > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {delta > 0 ? '+' : '−'}
                    {Math.abs(delta).toFixed(2)}
                  </span>
                )}
                {!readOnly && (
                  <span className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit?.(contract)}
                      aria-label={`Modifier le contrat ${label}`}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(contract)}
                      aria-label={`Supprimer le contrat ${label}`}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    >
                      <Icon name="delete" size={13} />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
