'use client';

import Drawer from '@/components/common/ui/Drawer';
import Icon from '@/components/common/ui/Icon';
import { getSuggestedEffectiveDate, sortByStartDesc } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';

import InsuranceForm from './InsuranceForm';

import type { DrawerMode, DrawerState } from '../hooks/useInsuranceDrawer';
import type { InsuranceFormData } from '@/types/insurance';

const DRAWER_TITLES: Record<DrawerMode, string> = {
  add: 'Ajouter un contrat',
  change: 'Changer de contrat',
  edit: 'Modifier le contrat',
};

interface InsuranceContractDrawerProps {
  drawer: DrawerState;
  onClose: () => void;
  onSave: (data: InsuranceFormData, pendingFiles: File[]) => Promise<boolean>;
  saving: boolean;
}

export default function InsuranceContractDrawer({
  drawer,
  onClose,
  onSave,
  saving,
}: InsuranceContractDrawerProps) {
  const { mode } = drawer;
  const isChange = mode === 'change';
  const base = sortByStartDesc(drawer.contracts)[0] ?? null;

  return (
    <Drawer isOpen={drawer.isOpen} onClose={onClose}>
      {mode && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Icon name="arrow-back" size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {DRAWER_TITLES[mode]}
            </h2>
          </div>
          <InsuranceForm
            key={`${mode}-${drawer.vehicleId}-${drawer.editingContract?.id ?? 'new'}`}
            mode={mode}
            initialContract={mode === 'edit' ? drawer.editingContract : null}
            defaultStartDate={
              isChange ? getSuggestedEffectiveDate(drawer.contracts, getLocalToday()) : undefined
            }
            defaultProvider={isChange ? (base?.provider ?? undefined) : undefined}
            defaultMonthlyCost={isChange ? base?.monthly_cost : undefined}
            currentContract={isChange ? base : null}
            onSave={onSave}
            onCancel={onClose}
            saving={saving}
          />
        </div>
      )}
    </Drawer>
  );
}
