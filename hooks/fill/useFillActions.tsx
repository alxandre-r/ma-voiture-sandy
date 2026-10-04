// hooks/fill/useFillActions.tsx
import { useState } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { apiCall } from '@/lib/api/client';
import { ODOMETER_REQUIRED, parseOdometer } from '@/lib/utils/odometer';
import { uploadPendingAttachments } from '@/lib/utils/uploadAttachments';
import { validateBaseExpenseFields } from '@/lib/utils/validateExpense';

import type { FillFormData } from '@/types/fill';

/**
 * Auto-calculations for liters (fuel) or kWh (electric) from amount and unit price.
 * Pure: `data` is a full spread of the previous state; `base` only fills the identity fields.
 */
export function calculateFillValues(
  data: Partial<FillFormData>,
  base?: Partial<FillFormData> | null,
): FillFormData {
  // No base fallback for numeric values: clearing a field (null) must not revert to the old value
  const amount = data.amount ?? 0;
  const pricePerLiter = data.price_per_liter ?? 0;
  const pricePerKwh = data.price_per_kwh ?? 0;
  const chargeType = data.charge_type ?? base?.charge_type ?? 'fill';

  const result: FillFormData = {
    vehicle_id: data.vehicle_id ?? base?.vehicle_id ?? 0,
    date: data.date ?? base?.date ?? new Date().toISOString().split('T')[0],
    odometer: data.odometer ?? 0,
    liters: data.liters ?? 0,
    amount,
    price_per_liter: pricePerLiter,
    notes: data.notes ?? base?.notes ?? '',
    charge_type: chargeType,
    kwh: data.kwh ?? 0,
    price_per_kwh: pricePerKwh,
  };

  // Quantity is always derived from the price, never the reverse
  if (chargeType === 'charge') {
    if (amount && pricePerKwh) result.kwh = Number((amount / pricePerKwh).toFixed(2));
  } else if (amount && pricePerLiter) {
    result.liters = Number((amount / pricePerLiter).toFixed(2));
  }

  return result;
}

/** Body shared by fills/add and fills/update. A charge has no liters (fills_energy_consistency). */
function toFillPayload(data: FillFormData) {
  const isCharge = data.charge_type === 'charge';
  return {
    vehicle_id: data.vehicle_id,
    date: data.date,
    odometer: data.odometer ? parseInt(data.odometer.toString(), 10) : null,
    liters: isCharge ? null : (data.liters ?? null),
    amount: data.amount ?? null,
    // price_per_liter is NOT NULL in the DB
    price_per_liter: isCharge ? 0 : (data.price_per_liter ?? null),
    notes: data.notes || null,
    charge_type: isCharge ? 'charge' : 'fill',
    kwh: isCharge ? (data.kwh ?? null) : null,
    price_per_kwh: isCharge ? (data.price_per_kwh ?? null) : null,
  };
}

export function useFillActions() {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [adding, setAdding] = useState(false);

  /** --- Validate fill data --- */
  const validateFillData = (data: FillFormData): boolean => {
    if (!validateBaseExpenseFields(data, showError)) return false;
    if (!parseOdometer(data.odometer)) {
      showError(ODOMETER_REQUIRED);
      return false;
    }

    if (data.charge_type === 'charge') {
      if ((data.kwh == null || data.kwh === 0) && !data.price_per_kwh) {
        showError('Veuillez entrer soit les kWh, soit le prix au kWh');
        return false;
      }
    } else if ((data.liters == null || data.liters === 0) && !data.price_per_liter) {
      showError('Veuillez entrer soit les litres, soit le prix au litre');
      return false;
    }
    return true;
  };

  /** --- Add new fill or charge --- */
  const addFill = async (fillData: FillFormData, pendingFiles?: File[]) => {
    setAdding(true);

    try {
      if (!validateFillData(fillData)) return false;

      const data = await apiCall<{ fill?: { expense_id: number } }>('/api/fills/add', {
        method: 'POST',
        body: JSON.stringify(toFillPayload(fillData)),
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

  /** --- Update an existing fill or charge, identified by its expense id --- */
  const updateFill = async (expenseId: number, fillData: FillFormData): Promise<boolean> => {
    try {
      if (!validateFillData(fillData)) return false;

      await apiCall('/api/fills/update', {
        method: 'PATCH',
        body: JSON.stringify({ id: expenseId, ...toFillPayload(fillData) }),
      });
      showSuccess(
        fillData.charge_type === 'charge'
          ? 'Recharge modifiée avec succès'
          : 'Plein modifié avec succès',
      );
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la modification du plein');
      return false;
    }
  };

  return {
    adding,
    addFill,
    updateFill,
    calculateFillValues,
    validateFillData,
  };
}
