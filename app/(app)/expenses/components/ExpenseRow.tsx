'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import Icon from '@/components/common/ui/Icon';
import { onActivateKey } from '@/lib/utils/a11y';
import { getCategoryColor, getCategoryIcon, getCategoryLabel } from '@/lib/utils/expensesUtils';
import { formatCurrency } from '@/lib/utils/format';
import { getVehicleName } from '@/lib/utils/vehicleUtils';

import ExpenseActionMenu from './ExpenseActionMenu';
import { getDescription } from './expenseListUtils';

import type { Expense } from '@/types/expense';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

interface ExpenseRowProps {
  expense: Expense;
  vehicles: (Vehicle | VehicleMinimal)[];
  onViewDetail: (e: Expense) => void;
  onEdit?: (e: Expense) => void;
  onDelete?: (id: number) => void;
  currentUserId?: string | null;
  writableVehicleIds?: Set<number>;
}

export default function ExpenseRow({
  expense,
  vehicles,
  onViewDetail,
  onEdit,
  onDelete,
  currentUserId,
  writableVehicleIds,
}: ExpenseRowProps) {
  const desc = getDescription(expense);
  const isOwner = !!(currentUserId && expense.owner_id === currentUserId);
  const hasVehicleWrite = !!(expense.vehicle_id && writableVehicleIds?.has(expense.vehicle_id));
  const canEdit = (isOwner || hasVehicleWrite) && expense.type !== 'insurance';
  const canDelete = (isOwner || hasVehicleWrite) && expense.type !== 'insurance';
  const hasAttachments = !!expense.attachments?.length;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${getCategoryLabel(expense)}, ${formatCurrency(expense.amount)} : voir le détail`}
      onClick={() => onViewDetail(expense)}
      onKeyDown={onActivateKey(() => onViewDetail(expense))}
      className="focus-visible:outline-2 focus-visible:outline-custom-1 focus-visible:-outline-offset-2 cursor-pointer relative flex items-center gap-3 sm:gap-4 py-3 px-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
    >
      {/* Category icon */}
      <div
        className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl shrink-0 ${getCategoryColor(expense.type)}`}
      >
        <Icon name={getCategoryIcon(expense.type)} size={16} className="text-white" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {getCategoryLabel(expense)}
          </p>
          {hasAttachments && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium shrink-0">
              <Icon name="notes" size={11} />
              {expense.attachments!.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 max-w-[45%] truncate">
            {getVehicleName(expense.vehicle_id, vehicles)}
          </span>
          {/* Desktop: desc (hidden on mobile) */}
          {desc && (
            <>
              <span className="hidden sm:block text-gray-300 dark:text-gray-600 text-xs shrink-0">
                ·
              </span>
              <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-500 truncate">
                {desc}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mobile: amount as its own column so it aligns vertically with the ⋮ button */}
      <span className="sm:hidden text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
        {formatCurrency(expense.amount)}
      </span>

      {/* Desktop: date + amount + attachment badge + ⋮ button */}
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-500 tabular-nums w-12 text-right">
          {format(new Date(expense.date), 'dd MMM', { locale: fr })}
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-20 text-right tabular-nums">
          {formatCurrency(expense.amount)}
        </span>
        {/* Fixed-width ⋮ slot — always reserved, button only on owner rows */}
        <div
          className="w-8 flex justify-center"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          {(canEdit || canDelete) && (
            <ExpenseActionMenu
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}
        </div>
      </div>

      {/* Mobile: ⋮ button */}
      <div className="sm:hidden shrink-0" role="presentation" onClick={(e) => e.stopPropagation()}>
        {canEdit || canDelete ? (
          <ExpenseActionMenu
            expense={expense}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ) : (
          <div className="w-8" />
        )}
      </div>
    </div>
  );
}
