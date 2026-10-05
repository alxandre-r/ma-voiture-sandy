/**
 * Comprehensive tests for SelectorsContext — covers the full preferences-to-filters flow:
 * initial state, DB vs localStorage priority, scope filtering, localStorage persistence,
 * and the setters.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

import { SelectorsProvider, useSelectors } from '@/contexts/SelectorsContext';

import type { UserPreferences } from '@/types/userPreferences';
import type { VehicleMinimal } from '@/types/vehicle';
import type { ReactNode } from 'react';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc';
const FAMILY_USER_ID = 'user-family-xyz';

const personalVehicle: VehicleMinimal = { vehicle_id: 1, owner_id: USER_ID, name: 'Ma voiture' };
const familyVehicle: VehicleMinimal = { vehicle_id: 2, owner_id: FAMILY_USER_ID, name: 'Famille' };
const allVehicles: VehicleMinimal[] = [personalVehicle, familyVehicle];

const DB_UPDATED_AT = '2024-06-01T10:00:00.000Z';
const OLDER_SYNCED_AT = '2024-05-31T10:00:00.000Z'; // older → DB wins
const NEWER_SYNCED_AT = '2024-06-01T11:00:00.000Z'; // newer → localStorage wins
const EQUAL_SYNCED_AT = DB_UPDATED_AT; // equal → localStorage wins (strict >)

function makePreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    user_id: USER_ID,
    show_consumption: true,
    show_insurance: true,
    show_vehicle_details: true,
    show_financials: true,
    default_period: 'month',
    default_vehicle_scope: 'all',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: DB_UPDATED_AT,
    ...overrides,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  VEHICLE_IDS: 'ma-voiture-selected-vehicles',
  PERIOD: 'ma-voiture-selected-period',
  PREFS_SYNCED_AT: 'ma-voiture-prefs-synced-at',
  KNOWN_VEHICLE_IDS: 'ma-voiture-known-vehicles',
};

function setLocalStorage(overrides: {
  vehicleIds?: number[];
  knownVehicleIds?: number[];
  period?: string;
  prefsSyncedAt?: string;
}) {
  if (overrides.vehicleIds !== undefined)
    localStorage.setItem(STORAGE_KEYS.VEHICLE_IDS, JSON.stringify(overrides.vehicleIds));
  if (overrides.knownVehicleIds !== undefined)
    localStorage.setItem(STORAGE_KEYS.KNOWN_VEHICLE_IDS, JSON.stringify(overrides.knownVehicleIds));
  if (overrides.period !== undefined) localStorage.setItem(STORAGE_KEYS.PERIOD, overrides.period);
  if (overrides.prefsSyncedAt !== undefined)
    localStorage.setItem(STORAGE_KEYS.PREFS_SYNCED_AT, overrides.prefsSyncedAt);
}

function makeWrapper(
  vehicles: VehicleMinimal[],
  preferences: UserPreferences | null,
  userId: string = USER_ID,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SelectorsProvider
        initialVehicles={vehicles}
        initialPreferences={preferences}
        currentUserId={userId}
      >
        {children}
      </SelectorsProvider>
    );
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ─── 1. Initial state (no localStorage, no preferences) ───────────────────────

describe('initial state — no localStorage, no preferences', () => {
  it('selects all vehicles by default', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1, 2]);
    });
  });

  // Same as the DB default of user_preferences.default_period (P5.17)
  it('defaults period to "month" when no preferences', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('month');
    });
  });
});

// ─── 2. Initial state — no localStorage, preferences exist ───────────────────

describe('initial state — no localStorage, DB preferences exist', () => {
  it('applies default_period from preferences', async () => {
    const prefs = makePreferences({ default_period: 'month' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('month');
    });
  });

  it('applies scope "personal" — only user\'s own vehicles', async () => {
    const prefs = makePreferences({ default_vehicle_scope: 'personal' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('applies scope "family" — only non-user vehicles', async () => {
    const prefs = makePreferences({ default_vehicle_scope: 'family' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([2]);
    });
  });

  it('applies scope "all" — all vehicles', async () => {
    const prefs = makePreferences({ default_vehicle_scope: 'all' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1, 2]);
    });
  });

  it('persists applied preferences to localStorage including knownVehicleIds', async () => {
    const prefs = makePreferences({ default_period: 'month', default_vehicle_scope: 'personal' });
    renderHook(() => useSelectors(), { wrapper: makeWrapper(allVehicles, prefs) });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.PERIOD)).toBe('month');
      expect(localStorage.getItem(STORAGE_KEYS.VEHICLE_IDS)).toBe(JSON.stringify([1]));
      expect(localStorage.getItem(STORAGE_KEYS.KNOWN_VEHICLE_IDS)).toBe(JSON.stringify([1, 2]));
      expect(localStorage.getItem(STORAGE_KEYS.PREFS_SYNCED_AT)).toBe(DB_UPDATED_AT);
    });
  });
});

// ─── 3. DB newer than localStorage sync → DB wins ────────────────────────────

describe('DB preferences newer than localStorage sync → DB wins', () => {
  it('overrides stale localStorage period with DB preference', async () => {
    setLocalStorage({
      vehicleIds: [1, 2],
      period: 'all',
      prefsSyncedAt: OLDER_SYNCED_AT,
    });

    const prefs = makePreferences({ default_period: 'month', default_vehicle_scope: 'all' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('month');
    });
  });

  it('overrides stale localStorage vehicle selection with DB scope', async () => {
    setLocalStorage({
      vehicleIds: [1, 2],
      period: 'year',
      prefsSyncedAt: OLDER_SYNCED_AT,
    });

    const prefs = makePreferences({ default_vehicle_scope: 'personal' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('no PREFS_SYNCED_AT in localStorage → DB prefs win (first login)', async () => {
    setLocalStorage({
      vehicleIds: [1, 2],
      period: 'all',
      // no prefsSyncedAt
    });

    const prefs = makePreferences({ default_period: 'month', default_vehicle_scope: 'personal' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('month');
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('updates PREFS_SYNCED_AT in localStorage to DB updated_at', async () => {
    setLocalStorage({ prefsSyncedAt: OLDER_SYNCED_AT });

    const prefs = makePreferences({ default_period: 'month' });
    renderHook(() => useSelectors(), { wrapper: makeWrapper(allVehicles, prefs) });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.PREFS_SYNCED_AT)).toBe(DB_UPDATED_AT);
    });
  });
});

// ─── 4. localStorage newer than DB sync → localStorage wins ──────────────────

describe('localStorage sync newer than DB → localStorage wins', () => {
  it('keeps localStorage period when sync is newer', async () => {
    setLocalStorage({
      vehicleIds: [1],
      period: 'all',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const prefs = makePreferences({ default_period: 'month' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('all');
    });
  });

  it('keeps localStorage vehicle selection when sync is newer', async () => {
    // User had [1, 2] known, selected only [1] (intentionally excluded [2])
    setLocalStorage({
      vehicleIds: [1],
      knownVehicleIds: [1, 2],
      period: 'year',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const prefs = makePreferences({ default_vehicle_scope: 'family' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('keeps localStorage when PREFS_SYNCED_AT equals DB updated_at (strict greater-than)', async () => {
    setLocalStorage({
      vehicleIds: [1, 2],
      period: 'all',
      prefsSyncedAt: EQUAL_SYNCED_AT,
    });

    const prefs = makePreferences({ default_period: 'month', default_vehicle_scope: 'personal' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      // localStorage should win because dbUpdatedAt > storedPrefsSyncedAt is false (equal)
      expect(result.current.selectedPeriod).toBe('all');
      expect(result.current.selectedVehicleIds).toEqual([1, 2]);
    });
  });
});

// ─── 5. localStorage wins — valid stored values are applied ──────────────────

describe('localStorage wins — stored values applied correctly', () => {
  it('applies stored period from localStorage', async () => {
    setLocalStorage({
      vehicleIds: [1],
      period: 'month',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedPeriod).toBe('month');
    });
  });

  it('ignores stale vehicle IDs that no longer exist', async () => {
    setLocalStorage({
      vehicleIds: [1, 99], // 99 doesn't exist
      period: 'year',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).not.toContain(99);
      expect(result.current.selectedVehicleIds).toContain(1);
    });
  });

  it('auto-adds vehicles that are genuinely new (not in knownVehicleIds)', async () => {
    // User had only vehicle 1 known (vehicle 2 was added later by a family member)
    setLocalStorage({
      vehicleIds: [1],
      knownVehicleIds: [1], // vehicle 2 was not known → it's truly new
      period: 'year',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toContain(1);
      expect(result.current.selectedVehicleIds).toContain(2);
    });
  });

  it('does NOT auto-add vehicles that were known but intentionally excluded', async () => {
    // User had both vehicles known, but only selected [1] — [2] is excluded on purpose
    setLocalStorage({
      vehicleIds: [1],
      knownVehicleIds: [1, 2],
      period: 'year',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('does NOT auto-add when KNOWN_VEHICLE_IDS is absent (existing browser, no safe baseline)', async () => {
    // Real-world: user set scope=personal via preferences, VEHICLE_IDS=[1] written,
    // but KNOWN_VEHICLE_IDS was never written (pre-fix browser state).
    // Without knownVehicleIds we cannot tell if [2] is "new" or "intentionally excluded".
    setLocalStorage({
      vehicleIds: [1],
      // no knownVehicleIds
      period: 'year',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const prefs = makePreferences({ default_vehicle_scope: 'personal' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      // Must NOT auto-add vehicle 2 — respect the stored selection
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('ignores invalid period values from localStorage', async () => {
    setLocalStorage({
      vehicleIds: [1],
      period: 'invalid-period',
      prefsSyncedAt: NEWER_SYNCED_AT,
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    await waitFor(() => {
      // Falls back to initialPreferences or default
      expect(['month', 'year', 'all']).toContain(result.current.selectedPeriod);
    });
  });
});

// ─── 6. Scope edge cases ──────────────────────────────────────────────────────

describe('scope edge cases', () => {
  it('scope "personal" with no personal vehicles keeps all vehicles selected', async () => {
    const onlyFamilyVehicles: VehicleMinimal[] = [familyVehicle];
    const prefs = makePreferences({ default_vehicle_scope: 'personal' });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(onlyFamilyVehicles, prefs),
    });

    await waitFor(() => {
      // ids.length === 0, so setSelectedVehicleIdsState is NOT called — keeps initial (all)
      expect(result.current.selectedVehicleIds).toEqual([2]);
    });
  });

  it('scope "family" with no family vehicles keeps all vehicles selected', async () => {
    const onlyPersonalVehicles: VehicleMinimal[] = [personalVehicle];
    const prefs = makePreferences({ default_vehicle_scope: 'family' });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(onlyPersonalVehicles, prefs),
    });

    await waitFor(() => {
      // ids.length === 0, so keeps initial state (all vehicles = [1])
      expect(result.current.selectedVehicleIds).toEqual([1]);
    });
  });

  it('scope without currentUserId falls back to all vehicles', async () => {
    const prefs = makePreferences({ default_vehicle_scope: 'personal' });

    function WrapperNoUserId({ children }: { children: ReactNode }) {
      return (
        <SelectorsProvider
          initialVehicles={allVehicles}
          initialPreferences={prefs}
          // no currentUserId
        >
          {children}
        </SelectorsProvider>
      );
    }

    const { result } = renderHook(() => useSelectors(), { wrapper: WrapperNoUserId });

    await waitFor(() => {
      expect(result.current.selectedVehicleIds).toEqual([1, 2]);
    });
  });
});

// ─── 7. setSelectedPeriod ────────────────────────────────────────────────────

describe('setSelectedPeriod', () => {
  it('updates selectedPeriod state', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedPeriod('month');
    });

    expect(result.current.selectedPeriod).toBe('month');
  });

  it('persists to localStorage', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedPeriod('all');
    });

    expect(localStorage.getItem(STORAGE_KEYS.PERIOD)).toBe('all');
  });
});

// ─── 8. setSelectedVehicleIds ────────────────────────────────────────────────

describe('setSelectedVehicleIds', () => {
  it('updates selectedVehicleIds state', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedVehicleIds([1]);
    });

    expect(result.current.selectedVehicleIds).toEqual([1]);
  });

  it('persists selectedVehicleIds to localStorage', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedVehicleIds([2]);
    });

    expect(localStorage.getItem(STORAGE_KEYS.VEHICLE_IDS)).toBe(JSON.stringify([2]));
  });

  it('persists knownVehicleIds (all current vehicles) to localStorage', async () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedVehicleIds([1]);
    });

    // Known vehicles = all vehicles, so future sessions know [2] was excluded not new
    expect(localStorage.getItem(STORAGE_KEYS.KNOWN_VEHICLE_IDS)).toBe(JSON.stringify([1, 2]));
  });
});

// ─── 9. periodLabel computed value ───────────────────────────────────────────

describe('periodLabel', () => {
  it('returns "ce mois" for month', async () => {
    const prefs = makePreferences({ default_period: 'month' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.periodLabel).toBe('ce mois');
    });
  });

  it('returns "cette année" for year', async () => {
    const prefs = makePreferences({ default_period: 'year' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.periodLabel).toBe('cette année');
    });
  });

  it('returns "tout" for all', async () => {
    const prefs = makePreferences({ default_period: 'all' });
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, prefs),
    });

    await waitFor(() => {
      expect(result.current.periodLabel).toBe('tout');
    });
  });

  it('updates when period changes', () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    act(() => {
      result.current.setSelectedPeriod('month');
    });

    expect(result.current.periodLabel).toBe('ce mois');
  });
});

// ─── 10. vehicles list ────────────────────────────────────────────────────────

describe('vehicles list', () => {
  it('exposes all initialVehicles via context', () => {
    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    expect(result.current.vehicles).toEqual(allVehicles);
  });
});

// ─── 11. useSelectors outside provider ───────────────────────────────────────

describe('useSelectors outside provider', () => {
  it('throws when used outside SelectorsProvider', () => {
    // Suppress React error output for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSelectors())).toThrow(
      'useSelectors must be used within a SelectorsProvider',
    );
    spy.mockRestore();
  });
});

// ─── 12. localStorage error resilience ───────────────────────────────────────

describe('localStorage error resilience', () => {
  it('does not throw when localStorage throws on read', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const prefs = makePreferences({ default_period: 'month' });

    expect(() =>
      renderHook(() => useSelectors(), { wrapper: makeWrapper(allVehicles, prefs) }),
    ).not.toThrow();

    getItemSpy.mockRestore();
  });

  it('does not throw when localStorage throws on write', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(() => useSelectors(), {
      wrapper: makeWrapper(allVehicles, null),
    });

    expect(() => {
      act(() => {
        result.current.setSelectedPeriod('all');
        result.current.setSelectedVehicleIds([1]);
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
