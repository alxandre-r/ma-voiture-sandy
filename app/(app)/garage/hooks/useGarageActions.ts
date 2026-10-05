// hooks/useGarageActions.ts
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';

import type { Vehicle } from '@/types/vehicle';

export interface UseGarageActionsReturn {
  // State
  isSubmitting: boolean;

  // Vehicle actions
  handleSaveVehicle: (vehicleData: Partial<Vehicle>, pendingFiles?: File[]) => Promise<boolean>;
  updateOdometer: (vehicleId: number, odometer: number) => Promise<void>;

  // View state
  viewState: 'list' | 'detail' | 'form';
  /** Id only: the caller looks the vehicle up in its current props, so router.refresh() shows fresh data. */
  selectedVehicleId: number | null;
  isEditing: boolean;

  // View actions
  handleVehicleClick: (vehicle: Vehicle) => void;
  handleEdit: (vehicle: Vehicle) => void;
  handleAddNew: () => void;
  handleCancel: () => void;
  handleBack: () => void;
}

export function useGarageActions(): UseGarageActionsReturn {
  const { showSuccess, showError, showWarning } = useNotifications();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewState, setViewState] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  /** --- Handle vehicle click (view detail) --- */
  const handleVehicleClick = useCallback((vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.vehicle_id);
    setViewState('detail');
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** --- Handle edit --- */
  const handleEdit = useCallback((vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.vehicle_id);
    setIsEditing(true);
    setViewState('form');
  }, []);

  /** --- Handle add new --- */
  const handleAddNew = useCallback(() => {
    setSelectedVehicleId(null);
    setIsEditing(false);
    setViewState('form');
  }, []);

  /** --- Handle form cancel --- */
  const handleCancel = useCallback(() => {
    setViewState(selectedVehicleId != null ? 'detail' : 'list');
    setIsEditing(false);
  }, [selectedVehicleId]);

  /** --- Handle back to list --- */
  const handleBack = useCallback(() => {
    setSelectedVehicleId(null);
    setViewState('list');
    setIsEditing(false);
  }, []);

  /** --- Save vehicle (add or update) --- */
  const handleSaveVehicle = useCallback(
    async (vehicleData: Partial<Vehicle>, pendingFiles?: File[]): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const isUpdate = !!vehicleData.vehicle_id;
        const endpoint = isUpdate ? '/api/vehicles/update' : '/api/vehicles/add';
        const method = isUpdate ? 'PATCH' : 'POST';

        // vehicles/add returns the inserted `vehicles` row, whose key is `id` (not `vehicle_id`)
        const data = await apiCall<{ vehicle?: { id: number } }>(endpoint, {
          method,
          body: JSON.stringify(vehicleData),
        });

        if (!isUpdate && pendingFiles?.length && data.vehicle?.id) {
          const { failedCount } = await uploadPendingAttachments(
            pendingFiles,
            'vehicle',
            data.vehicle.id,
          );
          if (failedCount > 0) {
            showWarning(`${failedCount} pièce(s) jointe(s) n'ont pas pu être téléchargées`);
          }
        }

        showSuccess(isUpdate ? 'Véhicule modifié avec succès !' : 'Véhicule ajouté avec succès !');

        // Refresh server data and go back to list
        router.refresh();
        handleBack();

        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        showError(`❌ ${msg}`);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleBack, router, showSuccess, showError, showWarning],
  );

  /** --- Update odometer inline --- */
  const updateOdometer = useCallback(
    async (vehicleId: number, odometer: number): Promise<void> => {
      try {
        await apiCall('/api/vehicles/update', {
          method: 'PATCH',
          body: JSON.stringify({ vehicle_id: vehicleId, odometer }),
        });
        showSuccess('Kilométrage mis à jour');
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        showError(msg);
      }
    },
    [router, showSuccess, showError],
  );

  return {
    isSubmitting,
    handleSaveVehicle,
    updateOdometer,
    viewState,
    selectedVehicleId,
    isEditing,
    handleVehicleClick,
    handleEdit,
    handleAddNew,
    handleCancel,
    handleBack,
  };
}
