'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import AttachmentSection from '@/components/common/attachments/AttachmentSection';
import { Card, CardContent, CardHeader, CardTitle, CardRow } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import InfoTooltip from '@/components/common/ui/InfoTooltip';
import ProfilePicture from '@/components/user/ProfilePicture';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatVehicleConsumption } from '@/lib/utils/consumption';
import { contractsOf, getHasActiveInsurance } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';
import { fuelTypeLabel } from '@/lib/utils/vehicleEnergy';
import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import { ConfirmationModal } from '../../../../components/common/ui/ConfirmationModal';

import HealthScoreCard from './HealthScoreCard';
import InsuranceSection from './InsuranceSection';

import type { Expense } from '@/types/expense';
import type { InsuranceData } from '@/types/insurance';
import type { Reminder } from '@/types/reminder';
import type { FamilyVisibilityPrefs } from '@/types/userPreferences';
import type { Vehicle } from '@/types/vehicle';

const TRANSMISSION_LABELS = { manual: 'Manuelle', automatic: 'Automatique' } as const;

interface VehicleOwner {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
}

interface VehicleDetailProps {
  vehicle: Vehicle;
  onBack: () => void;
  onEdit?: () => void;
  isFamilyVehicle?: boolean;
  owner?: VehicleOwner;
  expenses?: Expense[];
  reminders?: Reminder[];
  insurance: InsuranceData;
  ownerPreferences?: FamilyVisibilityPrefs | null;
}

export default function VehicleDetail({
  vehicle,
  onBack,
  onEdit,
  isFamilyVehicle,
  owner,
  expenses,
  reminders,
  insurance,
  ownerPreferences,
}: VehicleDetailProps) {
  const { showSuccess, showError } = useNotifications();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingOdometer, setEditingOdometer] = useState(false);
  const [odometerValue, setOdometerValue] = useState(String(vehicle.odometer ?? ''));
  const [savingOdometer, setSavingOdometer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non renseignée';
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/vehicles/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicle.vehicle_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression du véhicule');
      showSuccess('Véhicule supprimé avec succès !');
      router.refresh();
      onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      showError(`❌ ${msg}`);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveOdometer = async () => {
    const parsed = parseInt(odometerValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      showError('Kilométrage invalide');
      return;
    }
    setSavingOdometer(true);
    try {
      const res = await fetch('/api/vehicles/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicle.vehicle_id, odometer: parsed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Erreur lors de la mise à jour');
      }
      showSuccess('Kilométrage mis à jour');
      setEditingOdometer(false);
      router.refresh();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSavingOdometer(false);
    }
  };

  const getFinancingModeLabel = (mode: string | null | undefined) => {
    switch (mode) {
      case 'lld':
        return 'LLD';
      case 'loa':
        return 'LOA';
      case 'owned':
        return 'Propriétaire';
      default:
        return '—';
    }
  };

  const vehicleImage = vehicle.image;
  const vehicleName = vehicle.name || (vehicle.make ? `${vehicle.make} ${vehicle.model}` : '');
  const hasActiveInsurance = getHasActiveInsurance(insurance, vehicle, getLocalToday());
  const health = computeHealthScore(vehicle, { expenses, reminders, hasActiveInsurance });

  // Visibility — owner's preferences control what family members can see
  const showConsumption = !isFamilyVehicle || (ownerPreferences?.show_consumption ?? true);
  const showInsurance =
    !insurance.hiddenVehicleIds.includes(vehicle.vehicle_id) &&
    (!isFamilyVehicle || (ownerPreferences?.show_insurance ?? true));
  const showVehicleDetails = !isFamilyVehicle || (ownerPreferences?.show_vehicle_details ?? true);
  const showFinancials = !isFamilyVehicle || (ownerPreferences?.show_financials ?? true);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            aria-label="Retour"
            onClick={onBack}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition items-center flex shrink-0
            bg-white dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 cursor-pointer"
          >
            <Icon name="arrow-back" size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 truncate">
              {vehicle.make} {vehicle.model}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: vehicle.color || '#64748b' }}
              ></div>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-mono text-sm truncate">
              {vehicle.plate || 'Plaque non renseignée'}
            </p>
          </div>
        </div>

        {/* Settings menu — only shown when at least one action is available */}
        {(onEdit && (!isFamilyVehicle || vehicle.permission_level === 'write')) ||
        !isFamilyVehicle ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition flex items-center
              bg-white dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 cursor-pointer"
              aria-label="Paramètres"
            >
              <Icon name="settings" size={18} />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {onEdit && (!isFamilyVehicle || vehicle.permission_level === 'write') && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Icon name="edit" size={16} />
                      Modifier
                    </button>
                  )}
                  {!isFamilyVehicle && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleting}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      <Icon name="delete" size={16} />
                      Supprimer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Image & General informations - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700 shadow-sm">
          {vehicleImage ? (
            <Image
              src={vehicleImage}
              alt={vehicle.model || 'Vehicle'}
              className="w-full h-full object-cover"
              fill
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center">
              <Icon name="car" size={64} className="text-gray-300 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-500 mt-2 text-sm">Aucune image</span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white ${vehicle.status === 'active' ? 'bg-emerald-500/50' : 'bg-gray-500/40'} backdrop-blur-sm`}
            >
              {vehicle.status === 'active' ? 'Actif' : 'Inactif'}
            </span>
          </div>

          {/* Owner badge - show for family vehicles */}
          {isFamilyVehicle && owner && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <ProfilePicture
                avatarUrl={owner.avatar_url}
                name={owner.user_name}
                size="sm"
                className="w-6 h-6"
              />
              <span className="text-xs font-medium text-gray-700 pr-1">{owner.user_name}</span>
            </div>
          )}
        </div>

        {/* General Information Card */}
        {showVehicleDetails && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon name="settings" size={18} /> Informations Générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CardRow label="Marque" value={vehicle.make || '—'} />
              <CardRow label="Modèle" value={vehicle.model || '—'} />
              <CardRow label="Année" value={vehicle.year || '—'} />
              <CardRow label="VIN" value={vehicle.vin || '—'} className="font-mono" />
              <CardRow label="Propriétaire" value={vehicle.owner_name || '—'} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HealthScoreCard
          health={health}
          vehicleId={isFamilyVehicle ? undefined : vehicle.vehicle_id}
        />
        {showConsumption && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon name="tool" size={18} className="text-gray-500" /> Technique & Performances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CardRow label="Carburant" value={fuelTypeLabel(vehicle.fuel_type) || '—'} />
              <CardRow
                label="Transmission"
                value={vehicle.transmission ? TRANSMISSION_LABELS[vehicle.transmission] : '—'}
              />
              {/* Odometer — inline editable */}
              <div className="flex items-center justify-between py-2 px-1 gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                  Kilométrage
                </span>
                {editingOdometer ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveOdometer();
                        if (e.key === 'Escape') setEditingOdometer(false);
                      }}
                      className="w-28 text-sm text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <span className="text-sm text-gray-500">km</span>
                    <button
                      aria-label="Enregistrer le kilométrage"
                      onClick={handleSaveOdometer}
                      disabled={savingOdometer}
                      className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <Icon name="check" size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingOdometer(false);
                        setOdometerValue(String(vehicle.odometer ?? ''));
                      }}
                      className="p-1 text-gray-500 hover:text-gray-600"
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {vehicle.odometer != null ? vehicle.odometer.toLocaleString() + ' km' : '—'}
                    </span>
                    {!isFamilyVehicle && (
                      <button
                        onClick={() => setEditingOdometer(true)}
                        className="p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <CardRow
                label={
                  <span className="flex items-center gap-1">
                    Consommation
                    <InfoTooltip
                      title="Consommation calculée"
                      details={[
                        'Calculée depuis vos pleins et recharges enregistrés.',
                        'Formule : (litres ou kWh des pleins suivant le premier / km parcourus) × 100',
                        'Plus vous enregistrez de pleins, plus la valeur est précise.',
                      ]}
                    />
                  </span>
                }
                value={
                  formatVehicleConsumption(vehicle)?.replaceAll('/100', '/100 km') ??
                  '— (calculée depuis les pleins)'
                }
              />
              {vehicle.co2_emission != null && (
                <CardRow
                  label={
                    <span className="flex items-center gap-1">
                      CO₂ homologué
                      <InfoTooltip
                        title="Émissions CO₂ officielles"
                        details={[
                          'Valeur issue de la fiche technique constructeur.',
                          'Peut différer des émissions réelles selon le style de conduite.',
                        ]}
                      />
                    </span>
                  }
                  value={`${vehicle.co2_emission} g/km`}
                />
              )}
            </CardContent>
          </Card>
        )}

        {showInsurance && (
          <InsuranceSection
            vehicleId={vehicle.vehicle_id}
            contracts={contractsOf(insurance, vehicle.vehicle_id)}
            vehicleActive={!vehicle.status || vehicle.status === 'active'}
            isFamilyVehicle={isFamilyVehicle}
          />
        )}

        {showFinancials && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon name="euro" size={18} className="text-gray-500" /> Achat & Finance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CardRow
                label="Mode de financement"
                value={getFinancingModeLabel(vehicle.financing_mode)}
              />
              <CardRow label="Date d'achat / contrat" value={formatDate(vehicle.purchase_date)} />
              <CardRow
                label={
                  getFinancingModeLabel(vehicle.financing_mode) === 'Propriétaire'
                    ? "Prix d'achat"
                    : 'Loyer mensuel'
                }
                value={
                  vehicle.purchase_price
                    ? `${vehicle.purchase_price.toLocaleString()} €`
                    : 'Non renseigné'
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documents du véhicule */}
      {(vehicle.attachments?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="notes" size={18} className="text-gray-500" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentSection
              savedAttachments={vehicle.attachments}
              entityType="vehicle"
              entityId={vehicle.vehicle_id}
              isOwner={!isFamilyVehicle || vehicle.permission_level === 'write'}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le véhicule "${vehicleName}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
        isLoading={deleting}
      />
    </div>
  );
}
