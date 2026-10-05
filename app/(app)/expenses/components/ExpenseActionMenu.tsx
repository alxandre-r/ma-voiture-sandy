'use client';

import { useRef, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import { useClickOutside } from '@/lib/utils/clickOutside';

import type { Expense } from '@/types/expense';

interface ExpenseActionMenuProps {
  expense: Expense;
  onEdit?: (e: Expense) => void;
  onDelete?: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function ExpenseActionMenu({
  expense,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: ExpenseActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <Icon name="more-vertical" size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit!(expense);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="edit" size={14} />
              Modifier
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete!(expense.id);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="delete" size={14} />
              Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
