'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { useSelectors } from '@/contexts/SelectorsContext';
import { useUser } from '@/contexts/UserContext';
import { DEFAULT_PERIOD } from '@/types/period';

import type { UserPreferences } from '@/types/userPreferences';

type PreferencesPatch = Partial<
  Pick<
    UserPreferences,
    | 'show_consumption'
    | 'show_insurance'
    | 'show_vehicle_details'
    | 'show_financials'
    | 'default_period'
    | 'default_vehicle_scope'
  >
>;

export default function usePreferencesActions(initialPreferences: UserPreferences | null) {
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();
  const { setSelectedPeriod, setSelectedVehicleIds, vehicles } = useSelectors();
  const user = useUser();
  const [, startTransition] = useTransition();

  const defaults: UserPreferences = {
    user_id: '',
    show_consumption: true,
    show_insurance: true,
    show_vehicle_details: true,
    show_financials: true,
    default_period: DEFAULT_PERIOD,
    default_vehicle_scope: 'all',
    created_at: '',
    updated_at: '',
    ...initialPreferences,
  };

  const [prefs, setPrefs] = useState<UserPreferences>(defaults);

  const update = async (patch: PreferencesPatch) => {
    const previous = { ...prefs };

    // Optimistic update
    setPrefs((p) => ({ ...p, ...patch }));

    // Apply filter defaults immediately to the selectors (also updates localStorage)
    if (patch.default_period) {
      setSelectedPeriod(patch.default_period);
    }
    if (patch.default_vehicle_scope) {
      const scope = patch.default_vehicle_scope;
      if (scope === 'personal') {
        setSelectedVehicleIds(
          vehicles.filter((v) => v.owner_id === user.id).map((v) => v.vehicle_id),
        );
      } else if (scope === 'family') {
        setSelectedVehicleIds(
          vehicles.filter((v) => v.owner_id !== user.id).map((v) => v.vehicle_id),
        );
      } else {
        setSelectedVehicleIds(vehicles.map((v) => v.vehicle_id));
      }
    }

    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      const data = await res.json();

      if (!res.ok) {
        setPrefs(previous);
        showError(data.error || 'Erreur lors de la mise à jour des préférences');
        return;
      }

      showSuccess('Préférences enregistrées');
      // Mark localStorage as synced using the server's updated_at to match future comparisons
      try {
        if (data.updated_at) {
          localStorage.setItem('ma-voiture-prefs-synced-at', data.updated_at);
        }
      } catch {
        // Ignore storage errors
      }
      startTransition(() => router.refresh());
    } catch {
      setPrefs(previous);
      showError('Erreur lors de la mise à jour des préférences');
    }
  };

  return { prefs, update };
}
