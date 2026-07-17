'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Button from '@/components/common/ui/Button';
import { Card } from '@/components/common/ui/card';
import { ConfirmationModal } from '@/components/common/ui/ConfirmationModal';
import Icon from '@/components/common/ui/Icon';
import Spinner from '@/components/common/ui/Spinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { getActiveContract, getNextMonthlyPaymentDate } from '@/lib/utils/insuranceUtils';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';

import InsuranceContractDrawer from './components/InsuranceContractDrawer';
import InsuranceHistoryModal from './components/InsuranceHistoryModal';
import InsuranceStatsGrid from './components/InsuranceStatsGrid';
import InsuranceVehicleRow from './components/InsuranceVehicleRow';
import { useInsuranceContracts } from './hooks/useInsuranceContracts';
import { useInsuranceDrawer } from './hooks/useInsuranceDrawer';

import type { InsuranceContract, InsuranceFormData } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

interface AssuranceClientProps {
  vehicles: Vehicle[];
  ownedVehicleIds: number[];
}

const SAVE_MESSAGES = {
  add: "Contrat d'assurance ajouté !",
  'new-contract': 'Nouveau contrat enregistré !',
  'change-rate': 'Nouveau tarif enregistré !',
  edit: 'Contrat mis à jour !',
} as const;


export default function AssuranceClient({ vehicles, ownedVehicleIds }: AssuranceClientProps) {
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();

  const ownedSet = new Set(ownedVehicleIds);
  const ownedVehicles = vehicles.filter((v) => ownedSet.has(v.vehicle_id));
  const familyVehicles = vehicles.filter((v) => !ownedSet.has(v.vehicle_id));

  const { contractsMap, loading, refetchVehicle } = useInsuranceContracts(
    ownedVehicleIds,
    vehicles,
  );
  const { drawer, openDrawer, closeDrawer } = useInsuranceDrawer();

  const [saving, setSaving] = useState(false);
  const [deleteState, setDeleteState] = useState<{
    contract: InsuranceContract | null;
    vehicleId: number | null;
  }>({ contract: null, vehicleId: null });
  const [deleting, setDeleting] = useState(false);
  const [historyState, setHistoryState] = useState<{
    vehicle: Vehicle | null;
    contracts: InsuranceContract[];
  }>({ vehicle: null, contracts: [] });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const allActiveContracts: InsuranceContract[] = [];
  for (const vehicle of vehicles) {
    const active = getActiveContract(contractsMap.get(vehicle.vehicle_id) ?? []);
    if (active) allActiveContracts.push(active);
  }

  const totalMonthlyPremium = allActiveContracts.reduce((sum, c) => sum + c.monthly_cost, 0);
  const vehiclesInsuredCount = allActiveContracts.length;

  const nextPaymentEntry =
    allActiveContracts.length > 0
      ? allActiveContracts
          .map((c) => ({ contract: c, date: getNextMonthlyPaymentDate(c.start_date) }))
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
      : null;

  const nextPaymentVehicle = nextPaymentEntry
    ? (vehicles.find((v) => v.vehicle_id === nextPaymentEntry.contract.vehicle_id) ?? null)
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSave = async (
    formData: InsuranceFormData,
    pendingFiles: File[],
  ): Promise<boolean> => {
    if (!drawer.vehicleId || !drawer.mode) return false;
    setSaving(true);
    try {
      const res =
        drawer.mode === 'edit'
          ? await fetch('/api/insurance/update', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: drawer.editingContract!.id, ...formData }),
            })
          : await fetch('/api/insurance/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vehicle_id: drawer.vehicleId, ...formData }),
            });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      if (pendingFiles.length && data.contract?.id) {
        await uploadPendingAttachments(pendingFiles, 'insurance_contract', data.contract.id);
      }

      showSuccess(SAVE_MESSAGES[drawer.mode]);
      const vid = drawer.vehicleId;
      closeDrawer();
      await refetchVehicle(vid);
      router.refresh();
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteState.contract) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/insurance/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteState.contract.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      showSuccess('Contrat supprimé.');
      const vid = deleteState.vehicleId!;
      setDeleteState({ contract: null, vehicleId: null });
      await refetchVehicle(vid);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (ownedVehicles.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-in fade-in duration-300">
        <div className="w-14 h-14 bg-custom-1/10 rounded-full flex items-center justify-center mb-4">
          <Icon name="secure" size={28} className="text-custom-1" />
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
          Aucun véhicule à assurer
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
          Ajoutez un véhicule dans votre garage pour gérer vos assurances.
        </p>
        <Button
          variant="secondary"
          leftIcon={<Icon name="car" size={16} />}
          onClick={() => router.push('/garage')}
        >
          Aller au garage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Summary stats ── */}
      <InsuranceStatsGrid
        loading={loading}
        totalMonthlyPremium={totalMonthlyPremium}
        vehiclesInsuredCount={vehiclesInsuredCount}
        totalVehicleCount={vehicles.length}
        nextPaymentEntry={nextPaymentEntry}
        nextPaymentVehicle={nextPaymentVehicle}
      />

      {/* ── My vehicles ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="secure" size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Mes contrats
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {vehiclesInsuredCount}/{ownedVehicles.length}
            </span>
          </div>
        </div>

        <Card className="overflow-hidden p-0">

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            ownedVehicles.map((vehicle) => {
              const contracts = contractsMap.get(vehicle.vehicle_id) ?? [];
              return (
                <InsuranceVehicleRow
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  contracts={contracts}
                  onAdd={() => openDrawer('add', vehicle.vehicle_id, contracts)}
                  onNewContract={() => openDrawer('new-contract', vehicle.vehicle_id, contracts)}
                  onChangeRate={() => openDrawer('change-rate', vehicle.vehicle_id, contracts)}
                  onEdit={(contract) =>
                    openDrawer('edit', vehicle.vehicle_id, contracts, contract)
                  }
                  onDelete={(contract) =>
                    setDeleteState({ contract, vehicleId: vehicle.vehicle_id })
                  }
                  onShowHistory={() =>
                    setHistoryState({ vehicle, contracts })
                  }
                />
              );
            })
          )}
        </Card>
      </div>

      {/* ── Family vehicles ── */}
      {familyVehicles.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Icon name="family" size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Véhicules famille
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {familyVehicles.length}
            </span>
          </div>

          <Card className="overflow-hidden p-0">
              {familyVehicles.map((vehicle) => {
              const contracts = contractsMap.get(vehicle.vehicle_id) ?? [];
              return (
                <InsuranceVehicleRow
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  contracts={contracts}
                  isFamily
                />
              );
            })}
          </Card>
        </div>
      )}

      {/* ── Drawers & modals ── */}
      <InsuranceContractDrawer
        drawer={drawer}
        onClose={closeDrawer}
        onSave={handleSave}
        saving={saving}
      />

      <InsuranceHistoryModal
        isOpen={!!historyState.vehicle}
        onClose={() => setHistoryState({ vehicle: null, contracts: [] })}
        vehicle={historyState.vehicle}
        contracts={historyState.contracts}
        onEdit={(contract) => {
          setHistoryState({ vehicle: null, contracts: [] });
          const vid = contract.vehicle_id;
          openDrawer('edit', vid, historyState.contracts, contract);
        }}
        onDelete={(contract) => {
          setHistoryState({ vehicle: null, contracts: [] });
          setDeleteState({ contract, vehicleId: contract.vehicle_id });
        }}
      />

      <ConfirmationModal
        isOpen={!!deleteState.contract}
        onClose={() => setDeleteState({ contract: null, vehicleId: null })}
        onConfirm={handleDelete}
        title="Supprimer le contrat d'assurance"
        message="Cette action supprimera également toutes les dépenses d'assurance associées. Continuer ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
        isLoading={deleting}
      />
    </div>
  );
}
