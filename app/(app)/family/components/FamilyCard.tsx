/**
 * @file FamilyCard.tsx
 * @fileoverview Server Component orchestrateur d'une famille dans la vue multi-famille.
 * Affiche : header (nom, invite, settings), membres en pills, véhicules en grille.
 */

import { Suspense } from 'react';

import { getFamilyInfo } from '@/lib/data/family/getFamilyInfo';
import { getFamilyMembers } from '@/lib/data/family/getFamilyMembers';

import { FamilyCardHeader } from './FamilyCardHeader';
import FamilyCardMembers, { FamilyCardMembersSkeleton } from './FamilyCardMembers';
import FamilyCardVehicles from './FamilyCardVehicles';
import { FamilyErrorBoundary } from './FamilyErrorBoundary';

interface FamilyCardProps {
  familyId: string;
  isOwner: boolean;
  currentUserId: string;
}

export default async function FamilyCard({ familyId, isOwner, currentUserId }: FamilyCardProps) {
  // Fetch family info and member count in parallel
  // getFamilyMembers uses React cache() — safe to call here and again in FamilyCardMembers
  const [family, members] = await Promise.all([
    getFamilyInfo(familyId),
    getFamilyMembers(familyId),
  ]);

  if (!family) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <FamilyCardHeader family={family} isOwner={isOwner} memberCount={members.length} />
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Membres */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Membres
          </h4>
          <FamilyErrorBoundary>
            <Suspense fallback={<FamilyCardMembersSkeleton />}>
              <FamilyCardMembers familyId={familyId} currentUserId={currentUserId} />
            </Suspense>
          </FamilyErrorBoundary>
        </div>

        {/* Véhicules */}
        <div data-tour="family-vehicles">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Véhicules de la famille
          </h4>
          <FamilyErrorBoundary>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <FamilyCardVehicles familyId={familyId} currentUserId={currentUserId} />
            </Suspense>
          </FamilyErrorBoundary>
        </div>
      </div>
    </div>
  );
}
