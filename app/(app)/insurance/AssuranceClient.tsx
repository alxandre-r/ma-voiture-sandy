'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ConfirmationModal } from '@/components/common/ui/ConfirmationModal';
import Icon from '@/components/common/ui/Icon';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  contractsOf,
  getNextPaymentDate,
  getVehicleInsuranceStatus,
  isCovered,
} from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';

import InsuranceContractDrawer from './components/InsuranceContractDrawer';
import InsuranceStatsGrid from './components/InsuranceStatsGrid';
import InsuranceVehicleCard, { vehicleDisplayName } from './components/InsuranceVehicleCard';
import { useInsuranceDrawer } from './hooks/useInsuranceDrawer';

import type { DrawerMode } from './hooks/useInsuranceDrawer';
import type { InsuranceContract, InsuranceData, InsuranceFormData } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

interface AssuranceClientProps {
  ownedVehicles: Vehicle[];
  familyVehicles: Vehicle[];
  insurance: InsuranceData;
}

const SAVE_MESSAGES: Record<DrawerMode, string> = {
  add: 'Contrat ajouté !',
  change: 'Changement de contrat enregistré !',
  edit: 'Contrat mis à jour !',
};

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

export default function AssuranceClient({
  ownedVehicles,
  familyVehicles,
  insurance,
}: AssuranceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showWarning } = useNotifications();
  const { drawer, openDrawer, closeDrawer } = useInsuranceDrawer();
  const today = getLocalToday();
  const linkedVehicleId = Number(searchParams.get('vehicleId')) || null;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState<InsuranceContract | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // ── Deep link /insurance?vehicleId=X ───────────────────────────────────────
  useEffect(() => {
    if (!linkedVehicleId) return;
    setFocusedId(linkedVehicleId);
    document
      .getElementById(`insurance-vehicle-${linkedVehicleId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setFocusedId(null), 2500);
    return () => clearTimeout(timer);
  }, [linkedVehicleId]);

  // ── Stats (own vehicles in service only) ───────────────────────────────────
  const activeOwned = ownedVehicles.filter((v) => !v.status || v.status === 'active');
  const covered = activeOwned
    .map((vehicle) => ({
      vehicle,
      status: getVehicleInsuranceStatus(contractsOf(insurance, vehicle.vehicle_id), today),
    }))
    .filter(({ status }) => isCovered(status));
  const totalMonthlyPremium = covered.reduce(
    (sum, { status }) => sum + (status.current?.monthly_cost ?? 0),
    0,
  );
  const nextPayment =
    covered
      .map(({ vehicle, status }) => ({
        date: status.current ? getNextPaymentDate(status.current, today) : null,
        vehicleName: vehicleDisplayName(vehicle),
      }))
      .filter((p): p is { date: string; vehicleName: string } => p.date !== null)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handleSave = async (formData: InsuranceFormData, pendingFiles: File[]) => {
    if (!drawer.vehicleId || !drawer.mode) return false;
    setSaving(true);
    try {
      let data;
      if (drawer.mode === 'edit') {
        data = await send('/api/insurance/update', 'PATCH', {
          id: drawer.editingContract!.id,
          ...formData,
        });
      } else if (drawer.mode === 'change') {
        data = await send('/api/insurance/change', 'POST', {
          vehicle_id: drawer.vehicleId,
          monthly_cost: formData.monthly_cost,
          effective_date: formData.start_date,
          provider: formData.provider,
        });
      } else {
        data = await send('/api/insurance/create', 'POST', {
          vehicle_id: drawer.vehicleId,
          ...formData,
        });
      }

      if (pendingFiles.length && data.contract?.id) {
        const { warning } = await uploadPendingAttachments(
          pendingFiles,
          'insurance_contract',
          data.contract.id,
        );
        if (warning) showWarning(warning);
      }
      showSuccess(SAVE_MESSAGES[drawer.mode]);
      closeDrawer();
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
    if (!toDelete) return;
    setDeleting(true);
    try {
      await send('/api/insurance/delete', 'DELETE', { id: toDelete.id });
      showSuccess('Contrat supprimé.');
      setToDelete(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {ownedVehicles.length > 0 && (
        <InsuranceStatsGrid
          totalMonthlyPremium={totalMonthlyPremium}
          insuredCount={covered.length}
          activeVehicleCount={activeOwned.length}
          nextPayment={nextPayment}
        />
      )}

      <section data-tour="insurance-overview" className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon name="secure" size={15} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mes véhicules</h2>
        </div>
        {ownedVehicles.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucun véhicule personnel —{' '}
            <Link href="/garage" className="text-custom-1 underline">
              ajoutez-en un depuis le garage
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {ownedVehicles.map((vehicle) => {
              const contracts = contractsOf(insurance, vehicle.vehicle_id);
              return (
                <InsuranceVehicleCard
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  contracts={contracts}
                  today={today}
                  highlighted={focusedId === vehicle.vehicle_id}
                  defaultExpanded={linkedVehicleId === vehicle.vehicle_id}
                  onAdd={() => openDrawer('add', vehicle.vehicle_id, contracts)}
                  onChange={() => openDrawer('change', vehicle.vehicle_id, contracts)}
                  onEdit={(contract) => openDrawer('edit', vehicle.vehicle_id, contracts, contract)}
                  onDelete={setToDelete}
                />
              );
            })}
          </div>
        )}
      </section>

      {familyVehicles.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="family" size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Véhicules famille
            </h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {familyVehicles.map((vehicle) => (
              <InsuranceVehicleCard
                key={vehicle.vehicle_id}
                vehicle={vehicle}
                contracts={contractsOf(insurance, vehicle.vehicle_id)}
                today={today}
                readOnly
                hidden={insurance.hiddenVehicleIds.includes(vehicle.vehicle_id)}
                highlighted={focusedId === vehicle.vehicle_id}
                defaultExpanded={linkedVehicleId === vehicle.vehicle_id}
              />
            ))}
          </div>
        </section>
      )}

      <InsuranceContractDrawer
        drawer={drawer}
        onClose={closeDrawer}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmationModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
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
