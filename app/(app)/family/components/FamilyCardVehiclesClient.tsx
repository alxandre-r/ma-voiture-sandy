'use client';

/**
 * @file FamilyCardVehiclesClient.tsx
 * @fileoverview Client Component pour l'affichage des véhicules d'une famille avec gestion des droits.
 */

import Image from 'next/image';
import { useState } from 'react';

import Icon from '@/components/common/ui/Icon';

import { VehiclePermissionsModal } from './VehiclePermissionsModal';

import type { FamilyVehicleSummary } from '@/types/vehicle';

type Vehicle = FamilyVehicleSummary;

interface Member {
  user_id: string;
  user_name: string;
}

interface FamilyCardVehiclesClientProps {
  vehicles: Vehicle[];
  members: Member[];
  currentUserId: string;
}

const PERMISSION_LABELS: Record<'read' | 'write', string> = {
  read: 'Lecture',
  write: 'Modification',
};

export function FamilyCardVehiclesClient({
  vehicles,
  members,
  currentUserId,
}: FamilyCardVehiclesClientProps) {
  const [permissionVehicle, setPermissionVehicle] = useState<Vehicle | null>(null);

  // Own vehicles first, then others
  const sorted = [...vehicles].sort((a, b) => {
    const aOwn = a.owner_id === currentUserId ? 1 : 0;
    const bOwn = b.owner_id === currentUserId ? 1 : 0;
    return bOwn - aOwn;
  });

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-500 italic">
        Aucun véhicule dans cette famille.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((vehicle) => {
          const isOwn = vehicle.owner_id === currentUserId;
          const label = vehicle.name || `${vehicle.make} ${vehicle.model}`;

          return (
            <div
              key={vehicle.vehicle_id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50"
            >
              {/* Image ou placeholder */}
              <div className="relative w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {vehicle.image ? (
                  <Image
                    src={vehicle.image}
                    alt={label}
                    quality={1}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"
                    />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {label}
                  {vehicle.year ? ` (${vehicle.year})` : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {isOwn ? 'Votre véhicule' : `Propriétaire : ${vehicle.owner_name}`}
                </p>
              </div>

              {/* Bouton droits — visible uniquement sur les véhicules du propriétaire */}
              {isOwn ? (
                <button
                  onClick={() => setPermissionVehicle(vehicle)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium 
                  text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-custom-1/50 hover:text-custom-1 hover:bg-custom-1/5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  <Icon name="secure" size={12} />
                  Droits
                </button>
              ) : vehicle.permission_level ? (
                <span className="flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {PERMISSION_LABELS[vehicle.permission_level]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {permissionVehicle && (
        <VehiclePermissionsModal
          isOpen={!!permissionVehicle}
          onClose={() => setPermissionVehicle(null)}
          vehicleId={permissionVehicle.vehicle_id}
          vehicleLabel={
            permissionVehicle.name ||
            `${permissionVehicle.make} ${permissionVehicle.model}` +
              (permissionVehicle.year ? ` (${permissionVehicle.year})` : '')
          }
          members={members}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
