'use client';

import { useState } from 'react';

import AttachmentSection from '@/components/common/attachments/AttachmentSection';
import { FormDate, FormField, FormInput } from '@/components/common/ui/form';
import Icon from '@/components/common/ui/Icon';
import Spinner from '@/components/common/ui/Spinner';
import { formatInsuranceDate } from '@/lib/utils/insuranceUtils';
import { addDaysIso, getLocalToday } from '@/lib/utils/isoDate';

import type { InsuranceContract, InsuranceFormData } from '@/types/insurance';

export type InsuranceFormMode = 'add' | 'change' | 'edit';

interface InsuranceFormProps {
  mode: InsuranceFormMode;
  /** Contract being edited (edit mode) */
  initialContract?: InsuranceContract | null;
  onSave: (data: InsuranceFormData, pendingFiles: File[]) => Promise<boolean>;
  onCancel: () => void;
  saving?: boolean;
  defaultStartDate?: string;
  defaultProvider?: string;
  defaultMonthlyCost?: number;
  /** Change mode: the contract that will be closed (for the helper line) */
  currentContract?: Pick<InsuranceContract, 'provider' | 'monthly_cost'> | null;
}

const SUBMIT_LABELS: Record<InsuranceFormMode, string> = {
  add: 'Ajouter',
  change: 'Enregistrer le changement',
  edit: 'Enregistrer',
};

export default function InsuranceForm({
  mode,
  initialContract,
  onSave,
  onCancel,
  saving = false,
  defaultStartDate,
  defaultProvider,
  defaultMonthlyCost,
  currentContract,
}: InsuranceFormProps) {
  const [startDate, setStartDate] = useState(
    defaultStartDate ?? initialContract?.start_date ?? getLocalToday(),
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: InsuranceFormData = {
      provider: (fd.get('provider') as string) || '',
      monthly_cost: Number(fd.get('monthly_cost')),
      start_date: fd.get('start_date') as string,
      end_date: (fd.get('end_date') as string) || '',
    };
    await onSave(data, pendingFiles);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Assureur">
        <FormInput
          name="provider"
          type="text"
          defaultValue={defaultProvider ?? initialContract?.provider ?? ''}
          placeholder="Ex : MAIF, Groupama, AXA…"
        />
      </FormField>

      <FormField label="Coût mensuel (€)" required>
        <FormInput
          name="monthly_cost"
          type="number"
          defaultValue={initialContract?.monthly_cost ?? defaultMonthlyCost ?? ''}
          placeholder="Ex : 65"
          min={0.01}
          step="0.01"
          required
        />
      </FormField>

      <FormField label={mode === 'change' ? "Date d'effet" : 'Date de début'} required>
        <FormDate
          name="start_date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </FormField>

      {mode === 'change' && currentContract && startDate && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Le contrat actuel (
          {[currentContract.provider, `${currentContract.monthly_cost.toFixed(2)} €`]
            .filter(Boolean)
            .join(', ')}
          ) prendra fin le {formatInsuranceDate(addDaysIso(startDate, -1))}.
        </p>
      )}

      {mode !== 'change' && (
        <FormField label="Date de fin">
          <FormDate name="end_date" defaultValue={initialContract?.end_date ?? ''} />
        </FormField>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pièces jointes
        </label>
        <AttachmentSection
          savedAttachments={initialContract?.attachments}
          entityType="insurance_contract"
          entityId={initialContract?.id}
          onPendingFilesChange={setPendingFiles}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-custom-2 hover:bg-custom-2-hover text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {saving ? (
            <>
              <Spinner color="white" /> Enregistrement...
            </>
          ) : (
            <>
              <Icon name="check" size={16} />
              {SUBMIT_LABELS[mode]}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
