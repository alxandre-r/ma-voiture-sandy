'use client';

import { useCallback, useState } from 'react';

import type { InsuranceContract } from '@/types/insurance';

export type DrawerMode = 'add' | 'change' | 'edit';

export interface DrawerState {
  isOpen: boolean;
  mode: DrawerMode | null;
  vehicleId: number | null;
  /** All contracts of the vehicle (for defaults and the change helper) */
  contracts: InsuranceContract[];
  editingContract: InsuranceContract | null;
}

const DRAWER_INITIAL: DrawerState = {
  isOpen: false,
  mode: null,
  vehicleId: null,
  contracts: [],
  editingContract: null,
};

export function useInsuranceDrawer() {
  const [drawer, setDrawer] = useState<DrawerState>(DRAWER_INITIAL);

  const openDrawer = useCallback(
    (
      mode: DrawerMode,
      vehicleId: number,
      contracts: InsuranceContract[],
      editingContract: InsuranceContract | null = null,
    ) => setDrawer({ isOpen: true, mode, vehicleId, contracts, editingContract }),
    [],
  );

  const closeDrawer = useCallback(() => setDrawer(DRAWER_INITIAL), []);

  return { drawer, openDrawer, closeDrawer };
}
