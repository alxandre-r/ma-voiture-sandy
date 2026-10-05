'use client';

import { useMemo } from 'react';

import { useSelectors } from '@/contexts/SelectorsContext';

/**
 * Affiche un indicateur discret du contexte actif (véhicule + période)
 * dans les pages dont les données dépendent des sélecteurs.
 * Hidden for "all vehicles" (or an empty selection, which means all) + the current month.
 */
export default function ContextBadge() {
  const { vehicles, selectedVehicleIds, selectedPeriod, periodLabel } = useSelectors();

  const vehicleLabel = useMemo(() => {
    // All vehicles (an empty selection also means all): nothing to say
    if (selectedVehicleIds.length === 0 || selectedVehicleIds.length === vehicles.length) return null;
    if (selectedVehicleIds.length === 1) {
      const v = vehicles.find((v) => v.vehicle_id === selectedVehicleIds[0]);
      if (v) return v.name || [v.make, v.model].filter(Boolean).join(' ');
    }
    if (selectedVehicleIds.length > 1) return `${selectedVehicleIds.length} véhicules`;
    return null;
  }, [selectedVehicleIds, vehicles]);

  // Compare the period value, not its label (the label is lowercase: 'ce mois')
  if (!vehicleLabel && selectedPeriod === 'month') return null;

  const parts: string[] = [];
  if (vehicleLabel) parts.push(vehicleLabel);
  parts.push(periodLabel);

  return (
    <p className="text-xs text-gray-500 dark:text-gray-500 -mt-2 mb-2">
      Données pour :{' '}
      <span className="font-medium text-gray-500 dark:text-gray-400">{parts.join(' · ')}</span>
    </p>
  );
}
