'use client';

import { useState } from 'react';

import { useMaintenanceForm } from '@/app/(app)/maintenance/hooks/useMaintenanceForm';
import AttachmentSection from '@/components/common/attachments/AttachmentSection';
import Button from '@/components/common/ui/Button';
import { FormField, FormInput, FormDate } from '@/components/common/ui/form';
import Icon from '@/components/common/ui/Icon';
import { MAINTENANCE_TYPES } from '@/types/maintenance';

import type { MaintenanceFormData } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import type { Expense } from '@/types/expense';
import type { VehicleMinimal } from '@/types/vehicle';

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ' +
  'px-3 py-2.5 text-sm focus:border-custom-1 focus:ring-1 focus:ring-custom-1/30 ' +
  'hover:border-gray-400 dark:hover:border-gray-600 transition-colors';

interface MaintenanceFormProps {
  initialExpense?: Expense | null;
  vehicles: VehicleMinimal[];
  onSave: (
    data: MaintenanceFormData,
    expenseId?: number,
    pendingFiles?: File[],
  ) => Promise<boolean>;
  onCancel: () => void;
  saving?: boolean;
}

export default function MaintenanceForm({
  initialExpense,
  vehicles,
  onSave,
  onCancel,
  saving = false,
}: MaintenanceFormProps) {
  const isEditing = !!initialExpense;
  const { formData, handleChange } = useMaintenanceForm(vehicles, initialExpense);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const getVehicleName = (id: number) => {
    const v = vehicles.find((v) => v.vehicle_id === id);
    return v ? v.name || `${v.make} ${v.model}` : 'Véhicule';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData, initialExpense?.id, pendingFiles);
  };

  const title = isEditing ? "Modifier l'intervention" : 'Ajouter une intervention';

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
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <Icon name="car" size={16} className="inline mr-2 text-gray-500" />
            Véhicule <span className="text-red-500">*</span>
          </label>
          {vehicles.length === 1 ? (
            <input
              readOnly
              value={getVehicleName(vehicles[0].vehicle_id)}
              className={`${SELECT_CLASS} bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed`}
            />
          ) : (
            <select
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleChange}
              required
              className={SELECT_CLASS}
            >
              <option value="">Sélectionnez un véhicule</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.name || `${v.make} ${v.model}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Type d'entretien & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <Icon name="tool" size={16} className="inline mr-2 text-gray-500" />
              Type d&apos;entretien <span className="text-red-500">*</span>
            </label>
            <select
              name="maintenance_type"
              value={formData.maintenance_type}
              onChange={handleChange}
              required
              className={SELECT_CLASS}
            >
              {MAINTENANCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <FormField label="Date de l'intervention" icon="calendar">
            <FormDate name="date" value={formData.date} onChange={handleChange} required />
          </FormField>
        </div>

        {/* Kilométrage & Montant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <FormField label="Montant" icon="euro">
            <FormInput
              type="number"
              inputMode="decimal"
              name="amount"
              value={formData.amount || ''}
              onChange={handleChange}
              placeholder="Coût de l'intervention"
              step="0.01"
              autoFocus
            />
          </FormField>
        </div>

        {/* Garage */}
        <FormField label="Garage" icon="garage">
          <FormInput
            type="text"
            name="garage"
            value={formData.garage || ''}
            onChange={handleChange}
            placeholder="Nom du garage ou de l'intervenant"
          />
        </FormField>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <Icon name="notes" size={16} className="inline mr-2 text-gray-500" />
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Détails supplémentaires sur l'intervention..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm resize-none focus:border-custom-1 focus:ring-1 focus:ring-custom-1/30 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
          />
        </div>

        {/* Pièces jointes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <Icon name="notes" size={16} className="inline mr-2 text-gray-500" />
            Pièces jointes
          </label>
          <AttachmentSection
            savedAttachments={initialExpense?.attachments}
            entityType="expense"
            entityId={initialExpense?.id}
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
