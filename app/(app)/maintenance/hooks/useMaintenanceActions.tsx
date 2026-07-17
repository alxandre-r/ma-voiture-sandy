// hooks/maintenance/useMaintenanceActions.ts
import { useState, useCallback, useRef } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';
import { validateBaseExpenseFields } from '@/lib/utils/validateExpense';

export interface MaintenanceFormData {
  vehicle_id: number;
  date: string;
  amount: number;
  notes?: string;
  maintenance_type?: string;
  odometer?: number;
  garage?: string;
}

export function useMaintenanceActions() {
  const { showSuccess, showError, showWarning } = useNotifications();

  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  /** --- Set refresh callback --- */
  const setRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  /** --- Trigger refresh after successful operations --- */
  const triggerRefresh = useCallback(() => {
    if (refreshCallbackRef.current) {
      refreshCallbackRef.current();
    }
  }, []);

  /** --- Validate maintenance data --- */
  const validateMaintenanceData = (data: MaintenanceFormData): boolean => {
    return validateBaseExpenseFields(data, showError);
  };

  /** --- Add new maintenance --- */
  const addMaintenance = async (
    data: MaintenanceFormData,
    pendingFiles?: File[],
  ): Promise<boolean> => {
    if (!validateMaintenanceData(data)) {
      return false;
    }

    setAdding(true);
    try {
      const payload = {
        vehicle_id: data.vehicle_id,
        date: data.date,
        amount: Number(data.amount),
        notes: data.notes || null,
        maintenance_type: data.maintenance_type || 'other',
        odometer: data.odometer ? Number(data.odometer) : null,
        garage: data.garage || null,
      };

      const { expense } = await apiCall<{ expense: { id: number } }>('/api/maintenance/add', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (pendingFiles?.length && expense?.id) {
        const { failedCount } = await uploadPendingAttachments(pendingFiles, 'expense', expense.id);
        if (failedCount > 0) {
          showWarning(`${failedCount} pièce(s) jointe(s) n'ont pas pu être téléchargées`);
        }
      }

      showSuccess('Entretien ajouté avec succès !');
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setAdding(false);
    }
  };

  /** --- Update maintenance --- */
  const updateMaintenance = async (
    expenseId: number,
    data: Partial<MaintenanceFormData>,
  ): Promise<boolean> => {
    if (!data.vehicle_id || !data.date || data.amount === undefined) {
      showError('Veuillez remplir tous les champs requis');
      return false;
    }

    setSaving(true);
    try {
      // Use the existing expenses update endpoint
      const payload = {
        id: expenseId,
        vehicle_id: data.vehicle_id,
        date: data.date,
        amount: Number(data.amount),
        notes: data.notes || null,
        type: 'maintenance',
        maintenance_type: data.maintenance_type || null,
        odometer: data.odometer ? Number(data.odometer) : null,
        garage: data.garage || null,
      };

      await apiCall('/api/expenses/update', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      showSuccess('Entretien modifié avec succès !');
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** --- Delete maintenance --- */
  const deleteMaintenance = async (expenseId: number): Promise<boolean> => {
    setDeletingId(expenseId);
    try {
      await apiCall('/api/maintenance/delete', {
        method: 'DELETE',
        body: JSON.stringify({ expenseId }),
      });

      showSuccess('Entretien supprimé avec succès !');
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  return {
    saving,
    adding,
    deletingId,
    setRefreshCallback,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
  };
}
