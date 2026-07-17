'use client';

import { useCallback, useState } from 'react';

import AttachmentSection from '@/components/common/attachments/AttachmentSection';
import Button from '@/components/common/ui/Button';
import { FormField, FormInput, FormSelect, FormTextArea } from '@/components/common/ui/form';
import Icon from '@/components/common/ui/Icon';
import { useFillForm } from '@/hooks/fill/useFillForm';

import type { Fill, FillFormData } from '@/types/fill';
import type { VehicleMinimal } from '@/types/vehicle';

interface FillFormProps {
  initialFill?: Fill | null;
  vehicles: VehicleMinimal[];
  preselectedVehicleId?: number;
  forcedType?: 'fill' | 'charge';
  onSave: (data: FillFormData, fillId?: number, pendingFiles?: File[]) => Promise<boolean>;
  onCancel: () => void;
  saving?: boolean;
}

export default function FillForm({
  initialFill,
  vehicles,
  preselectedVehicleId,
  forcedType,
  onSave,
  onCancel,
  saving = false,
}: FillFormProps) {
  const isEditing = !!initialFill;
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { formData, handleChange, allowedTypes, canChangeChargeType, isElectric } = useFillForm(
    vehicles,
    initialFill,
    preselectedVehicleId,
    forcedType,
  );

  // Raw string state for decimal inputs.
  // Needed because formData stores numbers: typing "1." would snap back to "1"
  // (parseFloat("1.") = 1 → re-render → dot gone). We show rawValues in the input
  // and only push to formData when the value is a complete number.
  const [rawValues, setRawValues] = useState<Record<string, string>>({});

  const handleDecimalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      setRawValues((prev) => ({ ...prev, [name]: value }));

      const normalized = value.replace(',', '.');

      // Cas autorisés mais "incomplets"
      if (normalized === '' || normalized.endsWith('.') || normalized === '-') {
        handleChange({
          target: { name, value: '', type: 'text' },
        } as React.ChangeEvent<HTMLInputElement>);
        return;
      }

      const parsed = Number(normalized);

      if (!isNaN(parsed)) {
        handleChange({
          target: { name, value: normalized, type: 'text' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleChange],
  );

  const handleBlur = (name: string) => {
    setRawValues((prev) => {
      const val = prev[name];
      if (!val) return prev;

      const normalized = val.replace(',', '.');
      const parsed = Number(normalized);

      return {
        ...prev,
        [name]: !isNaN(parsed) ? String(parsed) : '',
      };
    });
  };

  const getRaw = (name: string, formValue: number | null | undefined): string =>
    rawValues[name] !== undefined
      ? rawValues[name]
      : formValue !== null && formValue !== undefined
        ? String(formValue)
        : '';

  const getVehicleName = (id: number) => {
    const v = vehicles.find((v) => v.vehicle_id === id);
    return v ? v.name || `${v.make} ${v.model}` : 'Véhicule';
  };

  const title = `${isEditing ? 'Modifier' : 'Ajouter'} ${isElectric ? 'une recharge' : 'un plein'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData, initialFill?.id, pendingFiles);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 flex items-center justify-center
          dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Retour"
        >
          <Icon name="arrow-back" size={18} />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Véhicule */}
        <FormField label="Véhicule" icon="car" required>
          {vehicles.length === 1 ? (
            <FormInput
              readOnly
              value={getVehicleName(vehicles[0].vehicle_id)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            />
          ) : (
            <FormSelect
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionnez un véhicule</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.name || `${v.make} ${v.model}`}
                </option>
              ))}
            </FormSelect>
          )}
        </FormField>

        {/* Type d'opération — uniquement si le véhicule supporte les deux modes */}
        {!forcedType && canChangeChargeType && (
          <FormField label="Type d'opération">
            <FormSelect
              name="charge_type"
              value={formData.charge_type}
              onChange={handleChange}
              disabled={!canChangeChargeType && formData.vehicle_id !== 0}
            >
              {allowedTypes.fill && <option value="fill">Plein de carburant</option>}
              {allowedTypes.charge && <option value="charge">Recharge électrique</option>}
            </FormSelect>
          </FormField>
        )}

        {/* Date & Kilométrage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" icon="calendar" required>
            <FormInput
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Kilométrage" icon="chart">
            <FormInput
              type="number"
              inputMode="numeric"
              name="odometer"
              value={formData.odometer || ''}
              onChange={handleChange}
              placeholder="Kilométrage actuel"
            />
          </FormField>
        </div>

        {/* Montant + Prix — côte à côte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Montant total (€)" icon="euro" required>
            <FormInput
              type="text"
              inputMode="decimal"
              name="amount"
              value={getRaw('amount', formData.amount)}
              onChange={handleDecimalChange}
              onBlur={() => handleBlur('amount')}
              placeholder="0.00"
              required
              autoFocus
            />
          </FormField>

          {isElectric ? (
            <FormField label="Prix au kWh (€)" required>
              <FormInput
                type="text"
                inputMode="decimal"
                name="price_per_kwh"
                value={getRaw('price_per_kwh', formData.price_per_kwh)}
                onChange={handleDecimalChange}
                onBlur={() => handleBlur('price_per_kwh')}
                placeholder="Ex: 0.25"
                required
              />
            </FormField>
          ) : (
            <FormField label="Prix au litre (€)" required>
              <FormInput
                type="text"
                inputMode="decimal"
                name="price_per_liter"
                value={getRaw('price_per_liter', formData.price_per_liter)}
                onChange={handleDecimalChange}
                placeholder="Ex: 1.65"
                required
              />
            </FormField>
          )}
        </div>

        {/* Notes */}
        <FormField label="Notes" icon="notes">
          <FormTextArea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            placeholder="Détails supplémentaires..."
          />
        </FormField>

        {/* Pièces jointes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <Icon name="notes" size={16} className="inline mr-2 text-gray-500" />
            Pièces jointes
          </label>
          <AttachmentSection
            savedAttachments={initialFill?.attachments}
            entityType="expense"
            entityId={initialFill?.expense_id}
            onPendingFilesChange={setPendingFiles}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={saving}
            leftIcon={<Icon name="check" size={16} />}
          >
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
