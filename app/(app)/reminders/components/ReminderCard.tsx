'use client';

import Link from 'next/link';
import { useState } from 'react';

import ReminderStatusBadge from '@/app/(app)/reminders/components/ReminderStatusBadge';
import AttachmentGallery from '@/components/common/attachments/AttachmentGallery';
import { ConfirmationModal } from '@/components/common/ui/ConfirmationModal';
import Icon from '@/components/common/ui/Icon';
import { formatReminderDue } from '@/lib/utils/reminderUtils';

import type { ReminderType, ReminderWithStatus } from '@/types/reminder';

interface ReminderCardProps {
  reminder: ReminderWithStatus;
  vehicleName?: string;
  currentUserId?: string;
  onComplete: (id: number, completed: boolean) => void;
  onEdit: (reminder: ReminderWithStatus) => void;
  onDelete: (id: number) => void;
  isCompleting?: boolean;
  isDeleting?: boolean;
  onDeleteAttachment?: (attachmentId: number) => void;
  deletingAttachmentId?: number | null;
}

const TYPE_LABELS: Record<ReminderType, string> = {
  maintenance: 'Entretien',
  insurance: 'Assurance',
  inspection: 'Contrôle technique',
  custom: 'Personnalisé',
};

export default function ReminderCard({
  reminder,
  vehicleName,
  currentUserId,
  onComplete,
  onEdit,
  onDelete,
  isCompleting = false,
  isDeleting = false,
  onDeleteAttachment,
  deletingAttachmentId,
}: ReminderCardProps) {
  const isOwner = !currentUserId || reminder.user_id === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dueText = formatReminderDue(reminder);
  const typeLabel = TYPE_LABELS[reminder.type] ?? reminder.type;

  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    onDelete(reminder.id);
  };

  return (
    <>
      <div
        className={`bg-gray-50 rounded-xl p-4 sm:p-6 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow relative ${
          reminder.is_completed ? 'opacity-60' : ''
        }`}
      >
        {/* More menu — top right */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={isCompleting || isDeleting}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <Icon name="more-vertical" size={18} className="text-gray-500 dark:text-gray-400" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {isOwner && !reminder.is_completed && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(reminder);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Icon name="edit" size={16} />
                  Modifier
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onComplete(reminder.id, !reminder.is_completed);
                }}
                disabled={isCompleting}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Icon name="check" size={16} />
                {reminder.is_completed ? 'Réactiver' : 'Marquer fait'}
              </button>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-700/50 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Icon name="delete" size={16} />
                  {isDeleting ? 'Suppression…' : 'Supprimer'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3 pr-8">
          <h4
            className={`text-base font-bold text-gray-900 dark:text-gray-100 ${
              reminder.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
            }`}
          >
            {reminder.title}
          </h4>

          {/* Vehicle badge */}
          {vehicleName && (
            <span className="px-2 py-0.5 text-xs font-medium bg-custom-1/10 text-custom-1 rounded-full border border-custom-1">
              {vehicleName}
            </span>
          )}

          {/* Type badge */}
          <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
            {typeLabel}
          </span>

          {/* Status */}
          {!reminder.is_completed && <ReminderStatusBadge status={reminder.status} />}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
          {/* Due info — hidden when no due condition */}
          {(reminder.due_date !== null || reminder.due_odometer !== null) && (
            <span className="flex items-center gap-1">
              <Icon name="calendar" size={14} />
              {dueText}
            </span>
          )}

          {/* Estimated date (km-only reminders) */}
          {reminder.due_odometer !== null &&
            reminder.due_date === null &&
            reminder.computedEstimatedDate && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                (estimation :{' '}
                {reminder.computedEstimatedDate.toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
                )
              </span>
            )}

          {/* Recurrence */}
          {reminder.is_recurring && reminder.recurrence_value && reminder.recurrence_type && (
            <span className="flex items-center gap-1">
              <Icon name="history" size={14} />
              {reminder.recurrence_type === 'km'
                ? `Tous les ${reminder.recurrence_value.toLocaleString('fr-FR')} km`
                : `Tous les ${reminder.recurrence_value} mois`}
            </span>
          )}
        </div>

        {/* Source maintenance (automatic reminders) */}
        {reminder.source_expense && (
          <Link
            href={`/maintenance?expenseId=${reminder.source_expense.id}`}
            className="inline-flex items-center gap-1 text-xs text-custom-1 hover:underline mb-3"
          >
            <Icon name="tool" size={12} />
            Créé automatiquement depuis l&apos;entretien du{' '}
            {new Date(reminder.source_expense.date).toLocaleDateString('fr-FR')}
          </Link>
        )}

        {/* Description */}
        {reminder.description && (
          <p className="text-gray-600 border-t border-gray-200 pt-3 mt-3 dark:text-gray-400 dark:border-gray-700 text-sm whitespace-pre-wrap">
            {reminder.description}
          </p>
        )}

        {/* Attachments */}
        {reminder.attachments && reminder.attachments.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <AttachmentGallery
              savedAttachments={reminder.attachments}
              onDeleteSaved={onDeleteAttachment ?? (() => {})}
              isOwner={isOwner}
              deletingId={deletingAttachmentId}
            />
          </div>
        )}

        {/* Mark as done — prominent button for active reminders */}
        {!reminder.is_completed && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <button
              onClick={() => onComplete(reminder.id, true)}
              disabled={isCompleting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="check" size={16} />
              {isCompleting ? 'Mise à jour…' : 'Marquer comme fait'}
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Supprimer le rappel"
        message="Êtes-vous sûr de vouloir supprimer ce rappel ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
        isLoading={isDeleting}
      />
    </>
  );
}
