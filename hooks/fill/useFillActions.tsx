// hooks/useFillActions.ts
import { useState } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';
import { validateBaseExpenseFields } from '@/lib/utils/validateExpense';

import type { Fill, FillFormData } from '@/types/fill';

export function useFillActions() {
  const { showSuccess, showError, showWarning } = useNotifications();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<FillFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [onRefresh, setOnRefresh] = useState<(() => void) | null>(null);

  /** --- Set refresh callback --- */
  const setRefreshCallback = (callback: () => void) => {
    setOnRefresh(() => callback);
  };

  /** --- Trigger refresh after successful operations --- */
  const triggerRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  /** --- Start editing a fill --- */
  const startEdit = (fill: Fill) => {
    setEditingId(fill.id ?? null);
    setEditData({
      vehicle_id: fill.vehicle_id,
      date: fill.date,
      odometer: fill.odometer,
      liters: fill.liters,
      amount: fill.amount,
      price_per_liter: fill.price_per_liter,
      notes: fill.notes ?? '',
      // Electric vehicle fields
      charge_type: fill.charge_type ?? 'fill',
      kwh: fill.kwh ?? 0,
      price_per_kwh: fill.price_per_kwh ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  /** --- Auto-calculations for liters/price/amount (fuel) or kWh/price/kWh (electric) --- */
  const calculateFillValues = (
    data: Partial<FillFormData>,
    baseData?: Partial<FillFormData> | null,
  ): FillFormData => {
    // Use baseData if provided (for create mode), otherwise use editData (for edit mode)
    const base = baseData ?? editData;

    // data is always a full spread of the previous state — no base fallback for numeric values.
    // Using base as fallback caused a bug where clearing a field (null) would revert to old value.
    const liters = data.liters ?? 0;
    const amount = data.amount ?? 0;
    const pricePerLiter = data.price_per_liter ?? 0;
    // Electric fields
    const kwh = data.kwh ?? 0;
    const pricePerKwh = data.price_per_kwh ?? 0;
    const chargeType = data.charge_type ?? base?.charge_type ?? 'fill';

    const result: FillFormData = {
      vehicle_id: data.vehicle_id ?? base?.vehicle_id ?? 0,
      date: data.date ?? base?.date ?? new Date().toISOString().split('T')[0],
      odometer: data.odometer ?? 0,
      liters: liters,
      amount: amount,
      price_per_liter: pricePerLiter,
      notes: data.notes ?? base?.notes ?? '',
      // Electric vehicle fields
      charge_type: chargeType,
      kwh: kwh,
      price_per_kwh: pricePerKwh,
    };

    // Auto-calculate quantity from price — never the reverse.
    // liters/kwh are always derived (never user-entered), so we never use them to recalculate price.
    if (chargeType === 'charge') {
      if (amount && pricePerKwh) {
        result.kwh = Number((amount / pricePerKwh).toFixed(2));
      }
    } else {
      if (amount && pricePerLiter) {
        result.liters = Number((amount / pricePerLiter).toFixed(2));
      }
    }

    return result;
  };

  /** --- Validate fill data --- */
  const validateFillData = (data: FillFormData): boolean => {
    if (!validateBaseExpenseFields(data, showError)) return false;

    // Validate based on charge type
    if (data.charge_type === 'charge') {
      // For electric charges: need either kWh or price_per_kwh
      if ((data.kwh == null || data.kwh === 0) && !data.price_per_kwh) {
        showError('Veuillez entrer soit les kWh, soit le prix au kWh');
        return false;
      }
    } else {
      // For fuel fills: need either liters or price_per_liter
      if ((data.liters == null || data.liters === 0) && !data.price_per_liter) {
        showError('Veuillez entrer soit les litres, soit le prix au litre');
        return false;
      }
    }
    return true;
  };

  /** --- Save edited fill --- */
  const saveEdit = async (fillId: number) => {
    if (!editData) return;
    setSaving(true);

    try {
      // Validate data
      if (!validateFillData(editData)) return;

      const isCharge = editData.charge_type === 'charge';

      // Convert all fields to proper types
      const payload = {
        vehicle_id: editData.vehicle_id,
        date: editData.date,
        odometer: Number(editData.odometer),
        // For electric charges, liters must be 0 (not null due to NOT NULL constraint)
        liters: isCharge ? 0 : Number(editData.liters),
        amount: Number(editData.amount),
        // For electric charges, price_per_liter must be 0 (not null due to NOT NULL constraint)
        price_per_liter: isCharge ? 0 : Number(editData.price_per_liter),
        notes: editData.notes,
        // Electric vehicle fields
        charge_type: editData.charge_type ?? 'fill',
        kwh: isCharge ? (editData.kwh ? Number(editData.kwh) : null) : null,
        price_per_kwh: isCharge
          ? editData.price_per_kwh
            ? Number(editData.price_per_kwh)
            : null
          : null,
      };

      // Check for NaN values
      if (isNaN(payload.odometer) || isNaN(payload.amount)) {
        throw new Error('Tous les champs numériques doivent être remplis correctement.');
      }

      await apiCall('/api/fills/update', {
        method: 'PATCH',
        body: JSON.stringify({ id: fillId, ...payload }),
      });
      showSuccess('Plein modifié avec succès !');
      cancelEdit();
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** --- Add new fill --- */
  const addFill = async (fillData: FillFormData, pendingFiles?: File[]) => {
    setAdding(true);

    try {
      // Validate data
      if (!validateFillData(fillData)) return false;

      const isCharge = fillData.charge_type === 'charge';
      const payload = {
        vehicle_id: fillData.vehicle_id,
        owner: '',
        date: fillData.date,
        odometer: fillData.odometer ? parseInt(fillData.odometer.toString(), 10) : null,
        // For electric charges, liters must be 0 (not null due to NOT NULL constraint)
        // For fuel fills, use the actual value or null
        liters: isCharge ? 0 : (fillData.liters ?? null),
        amount: fillData.amount ?? null,
        // For electric charges, price_per_liter must be 0 (not null due to NOT NULL constraint)
        price_per_liter: isCharge ? 0 : (fillData.price_per_liter ?? null),
        notes: fillData.notes || null,
        // Electric vehicle fields
        charge_type: fillData.charge_type || 'fill',
        kwh: isCharge ? (fillData.kwh ?? null) : null,
        price_per_kwh: isCharge ? (fillData.price_per_kwh ?? null) : null,
        created_at: new Date().toISOString(),
      };

      const data = await apiCall<{ fill?: { expense_id: number } }>('/api/fills/add', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (pendingFiles?.length && data.fill?.expense_id) {
        const { failedCount } = await uploadPendingAttachments(
          pendingFiles,
          'expense',
          data.fill.expense_id,
        );
        if (failedCount > 0) {
          showWarning(`${failedCount} pièce(s) jointe(s) n'ont pas pu être téléchargées`);
        }
      }

      showSuccess(
        fillData.charge_type === 'charge'
          ? 'Recharge ajoutée avec succès'
          : 'Plein ajouté avec succès',
      );
      return true;
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
      return false;
    } finally {
      setAdding(false);
    }
  };

  /** --- Delete fill --- */
  const requestDelete = (fillId: number) => {
    setDeletingId(fillId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return false;

    try {
      const res = await fetch('/api/fills/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fillId: deletingId }),
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression du plein');

      showSuccess('Plein supprimé avec succès !');
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
    }
  };

  /** --- Handle field changes with auto-calculations --- */
  const handleFieldChange = (key: string, value: unknown) => {
    if (!editData) return;

    const newData = { ...editData, [key]: value };
    const calculatedData = calculateFillValues(newData);
    setEditData(calculatedData);
  };

  /** --- Update existing fill (for editing from expense list) --- */
  const updateFill = async (fillId: number, fillData: FillFormData): Promise<boolean> => {
    try {
      // Validate data
      if (!validateFillData(fillData)) return false;

      const isCharge = fillData.charge_type === 'charge';
      const payload = {
        vehicle_id: fillData.vehicle_id,
        date: fillData.date,
        odometer: fillData.odometer ? parseInt(fillData.odometer.toString(), 10) : null,
        // For electric charges, liters must be 0 (not null due to NOT NULL constraint)
        liters: isCharge ? 0 : (fillData.liters ?? null),
        amount: fillData.amount ?? null,
        // For electric charges, price_per_liter must be 0 (not null due to NOT NULL constraint)
        price_per_liter: isCharge ? 0 : (fillData.price_per_liter ?? null),
        notes: fillData.notes || null,
        // Electric vehicle fields
        charge_type: fillData.charge_type || 'fill',
        kwh: isCharge ? (fillData.kwh ?? null) : null,
        price_per_kwh: isCharge ? (fillData.price_per_kwh ?? null) : null,
      };

      const res = await fetch('/api/fills/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fillId, ...payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Erreur lors de la modification du plein');
      }
      showSuccess(
        fillData.charge_type === 'charge'
          ? 'Recharge modifiée avec succès'
          : 'Plein modifié avec succès',
      );
      triggerRefresh();
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    }
  };

  return {
    editingId,
    editData,
    saving,
    adding,
    deletingId,
    showDeleteConfirm,
    setEditData,
    startEdit,
    cancelEdit,
    saveEdit,
    addFill,
    updateFill,
    requestDelete,
    confirmDelete,
    setShowDeleteConfirm,
    calculateFillValues,
    validateFillData,
    handleFieldChange,
    setRefreshCallback,
  };
}
