/**
 * @file app/(app)/garage/loading.tsx
 * @fileoverview Loading state for garage page - shown while Suspense boundaries resolve
 */
import Icon from '@/components/common/ui/Icon';

import { VehicleCardSkeleton } from './components/cards/VehicleCardSkeleton';

// Skeleton for personal vehicles section
function PersonalVehiclesSkeleton() {
  return (
    <div className="space-y-10">
      {/* Personal Vehicles Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Icon name="car" size={24} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
              Mes Véhicules
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            - VÉHICULE
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VehicleCardSkeleton />
        </div>
      </section>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300">
      <PersonalVehiclesSkeleton />
    </div>
  );
}
