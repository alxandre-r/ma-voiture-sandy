import { useState } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';
import { validateBaseExpenseFields } from '@/lib/utils/validateExpense';

export interface OtherFormData {
  vehicle_id: number;
  date: string;
  amount: number;
  label: string;
  notes?: string;
}

export function useOtherActions() {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const validateData = (data: OtherFormData): boolean => {
    if (!validateBaseExpenseFields(data, showError)) return false;
    if (!data.label?.trim()) {
      showError('Veuillez entrer un libellé');
      return false;
    }
    return true;
  };

  const addOther = async (data: OtherFormData, pendingFiles?: File[]): Promise<boolean> => {
    if (!validateData(data)) return false;

    setAdding(true);
    try {
      const { expense } = await apiCall<{ expense: { id: number } }>('/api/expenses/other/add', {
        method: 'POST',
        body: JSON.stringify({
          vehicle_id: data.vehicle_id,
          date: data.date,
          amount: Number(data.amount),
          label: data.label.trim(),
          notes: data.notes || null,
        }),
      });

      if (pendingFiles?.length && expense?.id) {
        const { failedCount } = await uploadPendingAttachments(pendingFiles, 'expense', expense.id);
        if (failedCount > 0) {
          showWarning(`${failedCount} pièce(s) jointe(s) n'ont pas pu être téléchargées`);
        }
      }

      showSuccess('Dépense ajoutée avec succès !');
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setAdding(false);
    }
  };

  const updateOther = async (expenseId: number, data: OtherFormData): Promise<boolean> => {
    if (!validateData(data)) return false;

    setSaving(true);
    try {
      await apiCall('/api/expenses/update', {
        method: 'PATCH',
        body: JSON.stringify({
          id: expenseId,
          vehicle_id: data.vehicle_id,
          date: data.date,
          amount: Number(data.amount),
          label: data.label.trim(),
          notes: data.notes || null,
          type: 'other',
        }),
      });

      showSuccess('Dépense modifiée avec succès !');
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { adding, saving, addOther, updateOther };
}
