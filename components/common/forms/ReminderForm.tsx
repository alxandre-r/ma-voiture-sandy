'use client';

import { useEffect, useState } from 'react';

import Button from '@/components/common/ui/Button';
import {
  FormDate,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from '@/components/common/ui/form';
import Icon from '@/components/common/ui/Icon';

import type { Reminder, ReminderFormData, ReminderType } from '@/types/reminder';
import type { VehicleMinimal } from '@/types/vehicle';

interface ReminderFormProps {
  initialReminder?: Reminder | null;
  /** Pre-fill form fields without entering edit mode (creates a new reminder) */
  prefill?: Partial<ReminderFormData>;
  vehicles: VehicleMinimal[];
  onSave: (data: ReminderFormData, id?: number) => Promise<boolean>;
  onCancel: () => void;
  saving?: boolean;
}

const TYPE_OPTIONS: { value: ReminderType; label: string }[] = [
  { value: 'maintenance', label: 'Entretien' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'inspection', label: 'Contrôle technique' },
  { value: 'custom', label: 'Personnalisé' },
];

export default function ReminderForm({
  initialReminder,
  prefill,
  vehicles,
  onSave,
  onCancel,
  saving = false,
}: ReminderFormProps) {
  const isEditing = !!initialReminder;

  const [form, setForm] = useState<ReminderFormData>({
    vehicle_id:
      initialReminder?.vehicle_id ?? prefill?.vehicle_id ?? vehicles[0]?.vehicle_id ?? null,
    type: initialReminder?.type ?? prefill?.type ?? 'maintenance',
    title: initialReminder?.title ?? prefill?.title ?? '',
    description: initialReminder?.description ?? prefill?.description ?? '',
    due_date: initialReminder?.due_date
      ? new Date(initialReminder.due_date).toISOString().split('T')[0]
      : (prefill?.due_date ?? ''),
    due_odometer: initialReminder?.due_odometer ?? prefill?.due_odometer ?? undefined,
    is_recurring: initialReminder?.is_recurring ?? false,
    recurrence_type: initialReminder?.recurrence_type ?? undefined,
    recurrence_value: initialReminder?.recurrence_value ?? undefined,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReminder) {
      setForm({
        vehicle_id: initialReminder.vehicle_id,
        type: initialReminder.type,
        title: initialReminder.title,
        description: initialReminder.description ?? '',
        due_date: initialReminder.due_date
          ? new Date(initialReminder.due_date).toISOString().split('T')[0]
          : '',
        due_odometer: initialReminder.due_odometer ?? undefined,
        is_recurring: initialReminder.is_recurring,
        recurrence_type: initialReminder.recurrence_type ?? undefined,
        recurrence_value: initialReminder.recurrence_value ?? undefined,
      });
    } else if (prefill) {
      setForm((prev) => ({
        ...prev,
        vehicle_id: prefill.vehicle_id ?? prev.vehicle_id,
        type: prefill.type ?? prev.type,
        title: prefill.title ?? prev.title,
        description: prefill.description ?? prev.description,
        due_date: prefill.due_date ?? prev.due_date,
        due_odometer: prefill.due_odometer ?? prev.due_odometer,
      }));
    }
  }, [initialReminder, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (form.is_recurring && (!form.recurrence_type || !form.recurrence_value)) {
      setError('Veuillez configurer la récurrence');
      return;
    }

    const payload: ReminderFormData = {
      ...form,
      due_date: form.due_date || undefined,
      due_odometer: form.due_odometer ? Number(form.due_odometer) : undefined,
      description: form.description?.trim() || undefined,
      recurrence_type: form.is_recurring ? form.recurrence_type : undefined,
      recurrence_value: form.is_recurring ? form.recurrence_value : undefined,
    };

    const success = await onSave(payload, initialReminder?.id);
    if (!success) setError('Une erreur est survenue. Veuillez réessayer.');
  };

  const set = <K extends keyof ReminderFormData>(key: K, value: ReminderFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const title = isEditing ? 'Modifier le rappel' : 'Nouveau rappel';

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
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Type */}
        <FormField label="Type" required>
          <FormSelect
            value={form.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              set('type', e.target.value as ReminderType)
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {/* Title */}
        <FormField label="Titre" required>
          <FormInput
            type="text"
            value={form.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('title', e.target.value)}
            placeholder="Ex : Vidange, Renouvellement assurance…"
          />
        </FormField>

        {/* Vehicle */}
        {vehicles.length > 0 && (
          <FormField label="Véhicule">
            <FormSelect
              value={form.vehicle_id ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                set('vehicle_id', e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun véhicule</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.name ?? `${v.make} ${v.model}`}
                </option>
              ))}
            </FormSelect>
          </FormField>
        )}

        {/* Due conditions */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date limite">
            <FormDate
              value={form.due_date ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('due_date', e.target.value || undefined)
              }
            />
          </FormField>
          <FormField label="Kilométrage limite">
            <FormInput
              type="number"
              value={form.due_odometer ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('due_odometer', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Ex : 50 000"
              min={0}
            />
          </FormField>
        </div>

        {/* Description */}
        <FormField label="Description">
          <FormTextArea
            value={form.description ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              set('description', e.target.value)
            }
            rows={2}
            placeholder="Notes supplémentaires…"
          />
        </FormField>

        {/* Recurrence toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_recurring"
            checked={form.is_recurring}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set('is_recurring', e.target.checked)
            }
            className="w-4 h-4 rounded text-custom-1 focus:ring-custom-1"
          />
          <label
            htmlFor="is_recurring"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Rappel récurrent
          </label>
        </div>

        {form.is_recurring && (
          <div className="grid grid-cols-2 gap-3 pl-7">
            <FormField label="Type">
              <FormSelect
                value={form.recurrence_type ?? ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  set('recurrence_type', (e.target.value as 'km' | 'time') || undefined)
                }
              >
                <option value="">--</option>
                <option value="km">Km</option>
                <option value="time">Mois</option>
              </FormSelect>
            </FormField>
            <FormField label="Valeur">
              <FormInput
                type="number"
                value={form.recurrence_value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  set('recurrence_value', e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder={form.recurrence_type === 'km' ? '10 000' : '12'}
                min={1}
              />
            </FormField>
          </div>
        )}

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
            {isEditing ? 'Enregistrer' : 'Créer le rappel'}
          </Button>
        </div>
      </form>
    </div>
  );
}
