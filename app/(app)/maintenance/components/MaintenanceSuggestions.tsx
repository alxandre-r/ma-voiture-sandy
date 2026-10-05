'use client';

import { useState } from 'react';

import Icon from '@/components/common/ui/Icon';

import type { MaintenanceSuggestion } from '@/lib/utils/maintenanceInsights';

interface MaintenanceSuggestionsProps {
  suggestions: MaintenanceSuggestion[];
  onCreateReminder: (suggestion: MaintenanceSuggestion) => void;
}

export default function MaintenanceSuggestions({
  suggestions,
  onCreateReminder,
}: MaintenanceSuggestionsProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (suggestions.length === 0) return null;

  const overdueCount = suggestions.filter((s) => (s.monthsOverdue ?? 0) > 0).length;

  return (
    <div
      data-tour="maintenance-suggestions"
      className="rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="bell" size={15} className="text-orange-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {suggestions.length} entretien{suggestions.length > 1 ? 's' : ''} à planifier
            {overdueCount > 0 && (
              <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">
                ({overdueCount} en retard)
              </span>
            )}
          </span>
        </div>
        <Icon
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={14}
          className="text-gray-500 shrink-0"
        />
      </button>

      {/* Rows */}
      {!collapsed && (
        <div className="border-t border-orange-100 dark:border-orange-900/30 divide-y divide-orange-100 dark:divide-orange-900/20">
          {suggestions.map((s) => {
            const isOverdue = (s.monthsOverdue ?? 0) > 0;
            const overdueSince =
              s.monthsOverdue !== null ? Math.round(Math.abs(s.monthsOverdue)) : null;
            const lastLabel = s.lastDoneDate
              ? `Dernière fois il y a ${overdueSince !== null ? Math.round((new Date().getTime() - new Date(s.lastDoneDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : '?'} mois`
              : 'Jamais effectué';

            return (
              <div
                key={`${s.vehicleId}-${s.maintenanceTypeId}`}
                className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900/60"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-orange-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                    {s.label}
                    <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-500">
                      — {s.vehicleName}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lastLabel}</p>
                </div>
                <button
                  onClick={() => onCreateReminder(s)}
                  className="shrink-0 text-xs font-medium text-custom-1 hover:underline whitespace-nowrap"
                >
                  Créer un rappel →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
