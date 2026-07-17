'use client';

import { useMemo } from 'react';

import { useSelectors } from '@/contexts/SelectorsContext';

/**
 * Affiche un indicateur discret du contexte actif (véhicule + période)
 * dans les pages dont les données dépendent des sélecteurs.
 * Masqué si "Tous les véhicules" + période par défaut (month).
 */
export default function ContextBadge() {
  const { vehicles, selectedVehicleIds, periodLabel } = useSelectors();

  const vehicleLabel = useMemo(() => {
    if (selectedVehicleIds.length === vehicles.length) return null; // tous = pas besoin
    if (selectedVehicleIds.length === 1) {
      const v = vehicles.find((v) => v.vehicle_id === selectedVehicleIds[0]);
      if (v) return v.name || [v.make, v.model].filter(Boolean).join(' ');
    }
    if (selectedVehicleIds.length > 1) return `${selectedVehicleIds.length} véhicules`;
    return null;
  }, [selectedVehicleIds, vehicles]);

  // Ne rien afficher si la sélection est maximale (tous les véhicules, période par défaut)
  if (!vehicleLabel && periodLabel === 'Ce mois') return null;

  const parts: string[] = [];
  if (vehicleLabel) parts.push(vehicleLabel);
  parts.push(periodLabel);

  return (
    <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-2">
      Données pour :{' '}
      <span className="font-medium text-gray-500 dark:text-gray-400">{parts.join(' · ')}</span>
    </p>
  );
}
