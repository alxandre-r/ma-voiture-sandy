'use client';

import { useEffect, useRef, useState } from 'react';

import Button from '@/components/common/ui/Button';
import Icon from '@/components/common/ui/Icon';
import {
  formatInsuranceDate,
  getActiveContract,
  getDaysUntilExpiry,
  getHistoricalContracts,
} from '@/lib/utils/insuranceUtils';

import type { InsuranceContract } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

// ── Status dot ───────────────────────────────────────────────────────────────

function getStatusDot(contract: InsuranceContract | null): string {
  if (!contract) return 'bg-custom-2';
  const days = getDaysUntilExpiry(contract);
  if (days !== null && days < 0) return 'bg-red-500';
  if (days !== null && days <= 30) return 'bg-amber-400';
  return 'bg-emerald-400';
}

// ── More menu dropdown ────────────────────────────────────────────────────────

interface MoreMenuProps {
  onNewContract?: () => void;
  onChangeRate?: () => void;
  onHistory?: () => void;
  onDelete?: () => void;
  hasHistory: boolean;
}

function MoreMenu({ onNewContract, onChangeRate, onHistory, onDelete, hasHistory }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded-lg transition-colors ${
          open
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="Plus d'actions"
      >
        <Icon name="more-vertical" size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden py-1">
          <button
            onClick={() => {
              onNewContract?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
          >
            <Icon name="add" size={14} className="text-gray-400 shrink-0" />
            Nouveau contrat
          </button>
          <button
            onClick={() => {
              onChangeRate?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
          >
            <Icon name="trending-up" size={14} className="text-gray-400 shrink-0" />
            Changer le tarif
          </button>
          {hasHistory && (
            <button
              onClick={() => {
                onHistory?.();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <Icon name="history" size={14} className="text-gray-400 shrink-0" />
              Historique
            </button>
          )}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
          <button
            onClick={() => {
              onDelete?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            <Icon name="delete" size={14} className="shrink-0" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main row ─────────────────────────────────────────────────────────────────

interface InsuranceVehicleRowProps {
  vehicle: Vehicle;
  contracts: InsuranceContract[];
  isFamily?: boolean;
  onAdd?: () => void;
  onNewContract?: () => void;
  onChangeRate?: () => void;
  onEdit?: (contract: InsuranceContract) => void;
  onDelete?: (contract: InsuranceContract) => void;
  onShowHistory?: () => void;
}

export default function InsuranceVehicleRow({
  vehicle,
  contracts,
  isFamily,
  onAdd,
  onNewContract,
  onChangeRate,
  onEdit,
  onDelete,
  onShowHistory,
}: InsuranceVehicleRowProps) {
  const activeContract = getActiveContract(contracts);
  const historicalContracts = getHistoricalContracts(contracts);
  const dotClass = getStatusDot(activeContract);
  const vehicleName =
    (vehicle.name ?? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()) || 'Véhicule';
  const annualCost = activeContract ? (activeContract.monthly_cost * 12).toFixed(0) : null;

  const meta: string[] = [];
  if (activeContract?.provider) meta.push(activeContract.provider);
  if (vehicle.plate) meta.push(vehicle.plate);
  if (activeContract?.start_date)
    meta.push(`Depuis ${formatInsuranceDate(activeContract.start_date)}`);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors">
      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 self-start mt-2 ${dotClass}`} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: name + cost */}
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {vehicleName}
          </p>
          {activeContract ? (
            <p className="text-sm font-bold text-custom-1 tabular-nums shrink-0 leading-none">
              {activeContract.monthly_cost.toFixed(2)}{' '}
              <span className="text-[11px] font-normal text-gray-400">€/mois</span>
            </p>
          ) : (
            !isFamily && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onAdd}
                leftIcon={<Icon name="add" size={12} />}
              >
                Ajouter
              </Button>
            )
          )}
        </div>

        {/* Line 2: meta info */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {activeContract ? (
            <>
              {meta.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-gray-200 dark:text-gray-700 select-none">·</span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">{item}</span>
                </span>
              ))}
              {annualCost && (
                <>
                  <span className="text-gray-200 dark:text-gray-700 select-none">·</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    {annualCost} €/an
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-xs font-medium text-custom-2">Aucun contrat</span>
          )}
        </div>
      </div>

      {/* Actions — always visible */}
      {!isFamily && activeContract && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit?.(activeContract)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-custom-1 hover:bg-custom-1/8 transition-colors"
            title="Modifier"
          >
            <Icon name="edit" size={14} />
          </button>
          <MoreMenu
            onNewContract={onNewContract}
            onChangeRate={onChangeRate}
            onHistory={historicalContracts.length > 0 ? onShowHistory : undefined}
            onDelete={() => onDelete?.(activeContract)}
            hasHistory={historicalContracts.length > 0}
          />
        </div>
      )}
    </div>
  );
}
