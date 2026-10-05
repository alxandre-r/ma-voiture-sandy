'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import { useClickOutside } from '@/lib/utils/clickOutside';
import { writableActiveVehicles } from '@/lib/utils/vehicleAccess';
import { vehicleEnergy } from '@/lib/utils/vehicleEnergy';

import type { VehicleMinimal } from '@/types/vehicle';

export type ExpenseType = 'fill' | 'charge' | 'maintenance' | 'other';

interface ExpenseButtonProps {
  vehicles: VehicleMinimal[];
  currentUserId: string | undefined;
  onSelectType: (type: ExpenseType) => void;
  onAddReminder?: () => void;
}

export default function ExpenseButton({
  vehicles,
  currentUserId,
  onSelectType,
  onAddReminder,
}: ExpenseButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  const minimalVehicles = writableActiveVehicles(vehicles, currentUserId);

  const fillVehicles = minimalVehicles.filter((v) => vehicleEnergy(v.fuel_type).fuel);
  const chargeVehicles = minimalVehicles.filter((v) => vehicleEnergy(v.fuel_type).electric);

  const hasActiveFuelVehicle = fillVehicles.length > 0;
  const hasActiveElectricVehicle = chargeVehicles.length > 0;

  const handleSelect = (type: ExpenseType) => {
    setShowMenu(false);
    setShowMobileSheet(false);
    onSelectType(type);
  };

  const handleReminderSelect = () => {
    setShowMenu(false);
    setShowMobileSheet(false);
    onAddReminder?.();
  };

  const menuOptions = (
    <div className="py-1">
      {hasActiveFuelVehicle && (
        <button
          onClick={() => handleSelect('fill')}
          className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
        >
          <Icon name="conso" size={20} />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">Plein de carburant</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Ajouter un plein d&#39;essence ou diesel
            </div>
          </div>
        </button>
      )}

      {hasActiveElectricVehicle && (
        <button
          onClick={() => handleSelect('charge')}
          className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
        >
          <Icon name="elec" size={20} />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">Recharge électrique</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Ajouter une recharge pour véhicule électrique
            </div>
          </div>
        </button>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      <button
        onClick={() => handleSelect('maintenance')}
        className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
      >
        <Icon name="tool" size={20} />
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">Entretien / Réparation</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Ajouter un entretien ou une réparation
          </div>
        </div>
      </button>

      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      <button
        onClick={() => handleSelect('other')}
        className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
      >
        <Icon name="euro" size={20} />
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">Autre dépense</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Ajouter une dépense diverse (péage, parking...)
          </div>
        </div>
      </button>

      {onAddReminder && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={handleReminderSelect}
            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
          >
            <Icon name="bell" size={20} />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Nouveau rappel</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Programmer un rappel d&#39;entretien
              </div>
            </div>
          </button>
        </>
      )}
    </div>
  );

  // Read-only users (family-only, read-shared) have nothing to add to; reminders need no vehicle
  if (minimalVehicles.length === 0 && !onAddReminder) return null;

  return (
    <>
      {/* Desktop button + dropdown */}
      <div className="hidden sm:flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            data-tour="expense-button"
            onClick={() => setShowMenu(!showMenu)}
            className="px-4 py-2 bg-custom-2 hover:bg-custom-2-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="add" size={18} />
            Ajouter une dépense
            <Icon name="arrow-down" size={14} />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {menuOptions}
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowMobileSheet(true)}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-custom-2 hover:bg-custom-2-hover text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer"
        aria-label="Ajouter une dépense"
      >
        <Icon name="add" size={24} />
      </button>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {showMobileSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sheet-backdrop"
              className="sm:hidden fixed inset-0 bg-black/40 z-40"
              style={{ marginBottom: 0 }} // fix space under the sheet (reason unknown)
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMobileSheet(false)}
            />

            {/* Panel */}
            <motion.div
              key="sheet-panel"
              className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl z-50 pb-8"
              style={{ marginBottom: 0 }} // fix space under the sheet (reason unknown)
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Ajouter une dépense
                </h3>
                <button
                  onClick={() => setShowMobileSheet(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                  aria-label="Fermer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {menuOptions}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
