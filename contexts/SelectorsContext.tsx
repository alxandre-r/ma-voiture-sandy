'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

import { DEFAULT_PERIOD, PERIOD_PRESET_LABELS } from '@/types/period';

import type { FamilyInfo } from '@/lib/data/family/getUserFamilies';
import type { CustomPeriod, PeriodPreset, PeriodSelection } from '@/types/period';
import type { UserPreferences } from '@/types/userPreferences';
import type { VehicleMinimal } from '@/types/vehicle';
import type { ReactNode } from 'react';

interface SelectorsContextType {
  // Vehicles list
  vehicles: VehicleMinimal[];
  // Families the user belongs to
  families: FamilyInfo[];
  // Vehicle selection
  selectedVehicleIds: number[];
  setSelectedVehicleIds: (ids: number[]) => void;
  // Period selection
  selectedPeriod: PeriodSelection;
  setSelectedPeriod: (period: PeriodSelection) => void;
  // Computed
  periodLabel: string;
}

interface SelectorsProviderProps {
  children: ReactNode;
  initialVehicles: VehicleMinimal[];
  initialFamilies?: FamilyInfo[];
  initialPreferences?: UserPreferences | null;
  currentUserId?: string;
}

const SelectorsContext = createContext<SelectorsContextType | undefined>(undefined);

// LocalStorage keys
const STORAGE_KEYS = {
  VEHICLE_IDS: 'ma-voiture-selected-vehicles',
  PERIOD: 'ma-voiture-selected-period',
  PREFS_SYNCED_AT: 'ma-voiture-prefs-synced-at',
  KNOWN_VEHICLE_IDS: 'ma-voiture-known-vehicles',
} as const;

const VALID_PRESETS: PeriodPreset[] = ['month', '3months', '6months', 'year', '12months', 'all'];

/** Deserialize a stored period string — handles both preset keys and custom JSON objects */
function deserializePeriod(raw: string): PeriodSelection | null {
  // Try JSON first (custom period)
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as CustomPeriod;
      if (parsed.preset === 'custom' && parsed.start && parsed.end) return parsed;
    } catch {
      // fall through
    }
  }
  // Plain preset key
  if ((VALID_PRESETS as string[]).includes(raw)) return raw as PeriodPreset;
  // Legacy 'month'/'year'/'all' are valid presets — already covered above
  return null;
}

/** Serialize a period for localStorage */
function serializePeriod(period: PeriodSelection): string {
  if (typeof period === 'object') return JSON.stringify(period);
  return period;
}

/** Build a human-readable label for the period selector button */
function buildPeriodLabel(period: PeriodSelection): string {
  if (typeof period === 'object' && period.preset === 'custom') {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${fmt(period.start)} – ${fmt(period.end)}`;
  }
  const labels: Record<PeriodPreset, string> = {
    month: 'ce mois',
    '3months': '3 derniers mois',
    '6months': '6 derniers mois',
    year: 'cette année',
    '12months': '12 derniers mois',
    all: 'tout',
  };
  return labels[period as PeriodPreset] ?? 'cette année';
}

/**
 * Global context for vehicle and period selection state.
 * Uses localStorage for persistence across page navigations in the browser.
 * The provider is placed at the layout level to ensure it's always available.
 */
export function SelectorsProvider({
  children,
  initialVehicles,
  initialFamilies = [],
  initialPreferences,
  currentUserId,
}: SelectorsProviderProps) {
  const [selectedVehicleIds, setSelectedVehicleIdsState] = useState<number[]>(() => {
    return initialVehicles.map((v) => v.vehicle_id);
  });

  const [selectedPeriod, setSelectedPeriodState] = useState<PeriodSelection>(
    () => (initialPreferences?.default_period as PeriodPreset | undefined) ?? DEFAULT_PERIOD,
  );

  // Hydrate from localStorage on mount, respecting DB preferences when they are newer
  useEffect(() => {
    try {
      const storedVehicleIds = localStorage.getItem(STORAGE_KEYS.VEHICLE_IDS);
      const storedPeriod = localStorage.getItem(STORAGE_KEYS.PERIOD);
      const storedPrefsSyncedAt = localStorage.getItem(STORAGE_KEYS.PREFS_SYNCED_AT);

      const dbUpdatedAt = initialPreferences?.updated_at ?? null;
      // DB preferences win when they are newer than the last time we synced them to localStorage
      const preferencesAreNewer =
        !!dbUpdatedAt && (!storedPrefsSyncedAt || dbUpdatedAt > storedPrefsSyncedAt);

      const storedKnownVehicleIds = localStorage.getItem(STORAGE_KEYS.KNOWN_VEHICLE_IDS);

      if (preferencesAreNewer && initialPreferences) {
        // Apply DB preferences and re-sync localStorage
        // Map legacy 3-value DB field to new PeriodSelection (DB only stores presets)
        const rawPeriod = initialPreferences.default_period as string | undefined;
        const period: PeriodSelection =
          rawPeriod && (VALID_PRESETS as string[]).includes(rawPeriod)
            ? (rawPeriod as PeriodPreset)
            : DEFAULT_PERIOD;
        setSelectedPeriodState(period);
        localStorage.setItem(STORAGE_KEYS.PERIOD, serializePeriod(period));

        const scope = initialPreferences.default_vehicle_scope;
        let ids: number[];
        if (scope === 'personal' && currentUserId) {
          ids = initialVehicles
            .filter((v) => v.owner_id === currentUserId)
            .map((v) => v.vehicle_id);
        } else if (scope === 'family' && currentUserId) {
          ids = initialVehicles
            .filter((v) => v.owner_id !== currentUserId)
            .map((v) => v.vehicle_id);
        } else {
          ids = initialVehicles.map((v) => v.vehicle_id);
        }
        if (ids.length > 0) setSelectedVehicleIdsState(ids);
        const allIds = initialVehicles.map((v) => v.vehicle_id);
        localStorage.setItem(STORAGE_KEYS.VEHICLE_IDS, JSON.stringify(ids));
        localStorage.setItem(STORAGE_KEYS.KNOWN_VEHICLE_IDS, JSON.stringify(allIds));
        localStorage.setItem(STORAGE_KEYS.PREFS_SYNCED_AT, dbUpdatedAt);
        return;
      }

      // localStorage wins — apply stored values
      if (storedVehicleIds) {
        const parsed = JSON.parse(storedVehicleIds) as number[];
        const validIds = parsed.filter((id) => initialVehicles.some((v) => v.vehicle_id === id));
        const newIds = storedKnownVehicleIds
          ? initialVehicles
              .map((v) => v.vehicle_id)
              .filter((id) => !(JSON.parse(storedKnownVehicleIds) as number[]).includes(id))
          : [];
        const merged = [...validIds, ...newIds];
        if (merged.length > 0) setSelectedVehicleIdsState(merged);
        localStorage.setItem(
          STORAGE_KEYS.KNOWN_VEHICLE_IDS,
          JSON.stringify(initialVehicles.map((v) => v.vehicle_id)),
        );
      }

      if (storedPeriod) {
        const deserialized = deserializePeriod(storedPeriod);
        if (deserialized) setSelectedPeriodState(deserialized);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [initialVehicles]);

  // Update localStorage when state changes
  const setSelectedVehicleIds = (ids: number[]) => {
    setSelectedVehicleIdsState(ids);
    try {
      localStorage.setItem(STORAGE_KEYS.VEHICLE_IDS, JSON.stringify(ids));
      localStorage.setItem(
        STORAGE_KEYS.KNOWN_VEHICLE_IDS,
        JSON.stringify(initialVehicles.map((v) => v.vehicle_id)),
      );
    } catch {
      // Ignore storage errors
    }
  };

  const setSelectedPeriod = (period: PeriodSelection) => {
    setSelectedPeriodState(period);
    try {
      localStorage.setItem(STORAGE_KEYS.PERIOD, serializePeriod(period));
    } catch {
      // Ignore storage errors
    }
  };

  // Computed period label (lowercase, used in stats summaries)
  const periodLabel = useMemo(() => buildPeriodLabel(selectedPeriod), [selectedPeriod]);

  const value = useMemo(
    () => ({
      vehicles: initialVehicles,
      families: initialFamilies,
      selectedVehicleIds,
      setSelectedVehicleIds,
      selectedPeriod,
      setSelectedPeriod,
      periodLabel,
    }),
    [initialVehicles, initialFamilies, selectedVehicleIds, selectedPeriod, periodLabel],
  );

  return <SelectorsContext.Provider value={value}>{children}</SelectorsContext.Provider>;
}

/**
 * Hook to access the shared selectors state.
 * Must be used within a SelectorsProvider.
 */
export function useSelectors() {
  const context = useContext(SelectorsContext);
  if (!context) {
    throw new Error('useSelectors must be used within a SelectorsProvider');
  }
  return context;
}

// Re-export for convenience
export { PERIOD_PRESET_LABELS };
