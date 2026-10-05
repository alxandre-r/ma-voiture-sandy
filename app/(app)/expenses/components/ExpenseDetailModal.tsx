'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

import AttachmentSection from '@/components/common/attachments/AttachmentSection';
import Icon from '@/components/common/ui/Icon';
import { Modal } from '@/components/common/ui/Modal';
import { getCategoryLabel } from '@/lib/utils/expensesUtils';
import { formatCurrency } from '@/lib/utils/format';
import { getVehicleName } from '@/lib/utils/vehicleUtils';

import type { Expense } from '@/types/expense';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
        {value}
      </span>
    </div>
  );
}

interface ExpenseDetailModalProps {
  expense: Expense;
  vehicles: (Vehicle | VehicleMinimal)[];
  currentUserId?: string | null;
  writableVehicleIds?: Set<number>;
  onClose: () => void;
  onEdit?: (e: Expense) => void;
  onDelete?: (id: number) => void;
}

export default function ExpenseDetailModal({
  expense,
  vehicles,
  currentUserId,
  writableVehicleIds,
  onClose,
  onEdit,
  onDelete,
}: ExpenseDetailModalProps) {
  const router = useRouter();
  const isOwner = !!(currentUserId && expense.owner_id === currentUserId);
  const hasVehicleWrite = !!(expense.vehicle_id && writableVehicleIds?.has(expense.vehicle_id));
  const canEdit = (isOwner || hasVehicleWrite) && expense.type !== 'insurance' && !!onEdit;
  const canDelete = (isOwner || hasVehicleWrite) && expense.type !== 'insurance' && !!onDelete;
  const hasAttachments = !!expense.attachments?.length;
  const showAttachments = isOwner || hasAttachments;

  return (
    <Modal isOpen onClose={onClose} title={getCategoryLabel(expense)} size="lg">
      {/* Amount hero */}
      <div className="text-center pb-5 border-b border-gray-100 dark:border-gray-800">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {formatCurrency(expense.amount)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {format(new Date(expense.date), 'dd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Details */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 py-2">
        <DetailRow label="Véhicule" value={getVehicleName(expense.vehicle_id, vehicles)} />

        {expense.type === 'fuel' && (
          <>
            {expense.liters != null && (
              <DetailRow label="Volume" value={`${expense.liters.toFixed(2)} L`} />
            )}
            {expense.price_per_liter != null && (
              <DetailRow label="Prix / litre" value={`${expense.price_per_liter.toFixed(3)} €/L`} />
            )}
          </>
        )}

        {expense.type === 'electric_charge' && (
          <>
            {expense.kwh != null && (
              <DetailRow label="Énergie" value={`${expense.kwh.toFixed(2)} kWh`} />
            )}
            {expense.price_per_kwh != null && (
              <DetailRow label="Prix / kWh" value={`${expense.price_per_kwh.toFixed(3)} €/kWh`} />
            )}
          </>
        )}

        {expense.type === 'maintenance' && (
          <>
            {expense.maintenance_type_label && (
              <DetailRow label="Type" value={expense.maintenance_type_label} />
            )}
            {expense.garage && <DetailRow label="Garage" value={expense.garage} />}
          </>
        )}

        {expense.type === 'other' && expense.label && (
          <DetailRow label="Libellé" value={expense.label} />
        )}

        {expense.odometer != null && (
          <DetailRow label="Kilométrage" value={`${expense.odometer.toLocaleString('fr-FR')} km`} />
        )}
      </div>

      {/* Notes */}
      {expense.notes && (
        <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">
            Notes
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {expense.notes}
          </p>
        </div>
      )}

      {/* Attachments */}
      {showAttachments && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
            Pièces jointes
          </p>
          <AttachmentSection
            savedAttachments={expense.attachments ?? []}
            entityType="expense"
            entityId={expense.id}
            isOwner={isOwner}
            onAttachmentsChange={router.refresh}
          />
        </div>
      )}

      {/* Actions */}
      {(canEdit || canDelete) && (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          {canDelete && (
            <button
              onClick={() => {
                onClose();
                onDelete!(expense.id);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <Icon name="delete" size={15} />
              Supprimer
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit!(expense);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-custom-2 hover:bg-custom-2-hover text-white transition-colors cursor-pointer"
            >
              <Icon name="edit" size={15} />
              Modifier
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
