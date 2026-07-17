'use client';

import Icon from '@/components/common/ui/Icon';

interface AdvancedFiltersProps {
  searchText: string;
  onSearchChange: (v: string) => void;
  minAmount: string;
  onMinAmountChange: (v: string) => void;
  maxAmount: string;
  onMaxAmountChange: (v: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  /** Mobile mode: compact horizontal layout inside a collapsible panel */
  mobile?: boolean;
}

export default function AdvancedFilters({
  searchText,
  onSearchChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
  onReset,
  hasActiveFilters,
  mobile = false,
}: AdvancedFiltersProps) {
  const inputClass =
    'w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-custom-1 transition-colors';

  return (
    <div
      className={
        mobile
          ? 'space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700'
          : 'space-y-2.5 pt-3 border-t border-gray-100 dark:border-gray-700'
      }
    >
      {/* Section label (desktop only) */}
      {!mobile && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Recherche
          </p>
          {hasActiveFilters && (
            <button onClick={onReset} className="text-[10px] text-custom-1 hover:underline">
              Effacer
            </button>
          )}
        </div>
      )}

      {/* Notes search */}
      <div className="relative">
        <Icon
          name="notes"
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Rechercher dans les notes…"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} pl-7`}
        />
      </div>

      {/* Amount range */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          placeholder="Min €"
          value={minAmount}
          onChange={(e) => onMinAmountChange(e.target.value)}
          min={0}
          className={inputClass}
        />
        <span className="text-gray-400 text-xs shrink-0">–</span>
        <input
          type="number"
          placeholder="Max €"
          value={maxAmount}
          onChange={(e) => onMaxAmountChange(e.target.value)}
          min={0}
          className={inputClass}
        />
      </div>

      {/* Mobile reset */}
      {mobile && hasActiveFilters && (
        <button onClick={onReset} className="text-xs text-custom-1 hover:underline">
          Tout effacer
        </button>
      )}
    </div>
  );
}
