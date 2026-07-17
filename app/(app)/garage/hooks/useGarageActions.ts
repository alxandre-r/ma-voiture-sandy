// hooks/useGarageActions.ts
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';

import type { Vehicle } from '@/types/vehicle';

export interface UseGarageActionsReturn {
  // State
  isLoading: boolean;
  isSubmitting: boolean;

  // Vehicle actions
  handleSaveVehicle: (vehicleData: Partial<Vehicle>, pendingFiles?: File[]) => Promise<boolean>;
  handleDeleteVehicle: (vehicleId: string) => Promise<boolean>;
  updateOdometer: (vehicleId: number, odometer: number) => Promise<void>;

  // View state
  viewState: 'list' | 'detail' | 'form';
  selectedVehicle: Vehicle | null;
  isEditing: boolean;

  // View actions
  handleVehicleClick: (vehicle: Vehicle) => void;
  handleEdit: (vehicle: Vehicle) => void;
  handleAddNew: () => void;
  handleCancel: () => void;
  handleBack: () => void;
}

export function useGarageActions(): UseGarageActionsReturn {
  const { showSuccess, showError } = useNotifications();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewState, setViewState] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  /** --- Handle vehicle click (view detail) --- */
  const handleVehicleClick = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setViewState('detail');
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** --- Handle edit --- */
  const handleEdit = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditing(true);
    setViewState('form');
  }, []);

  /** --- Handle add new --- */
  const handleAddNew = useCallback(() => {
    setSelectedVehicle(null);
    setIsEditing(false);
    setViewState('form');
  }, []);

  /** --- Handle form cancel --- */
  const handleCancel = useCallback(() => {
    if (selectedVehicle) {
      setViewState('detail');
    } else {
      setViewState('list');
    }
    setIsEditing(false);
  }, [selectedVehicle]);

  /** --- Handle back to list --- */
  const handleBack = useCallback(() => {
    setSelectedVehicle(null);
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

        const data = await apiCall<{ vehicle?: { vehicle_id: number } }>(endpoint, {
          method,
          body: JSON.stringify(vehicleData),
        });

        if (!isUpdate && pendingFiles?.length && data.vehicle?.vehicle_id) {
          await uploadPendingAttachments(pendingFiles, 'vehicle', data.vehicle.vehicle_id);
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
    [handleBack, router, showSuccess, showError],
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

  /** --- Delete vehicle --- */
  const handleDeleteVehicle = useCallback(
    async (vehicleId: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        await apiCall('/api/vehicles/delete', {
          method: 'DELETE',
          body: JSON.stringify({ vehicleId }),
        });

        showSuccess('Véhicule supprimé avec succès !');

        // Refresh server data and go back to list
        router.refresh();
        handleBack();

        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        showError(`❌ ${msg}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleBack, router, showSuccess, showError],
  );

  return {
    isLoading,
    isSubmitting,
    handleSaveVehicle,
    handleDeleteVehicle,
    updateOdometer,
    viewState,
    selectedVehicle,
    isEditing,
    handleVehicleClick,
    handleEdit,
    handleAddNew,
    handleCancel,
    handleBack,
  };
}
