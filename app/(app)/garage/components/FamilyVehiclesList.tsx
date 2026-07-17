'use client';

/**
 * @file FamilyVehiclesList.tsx
 * @fileoverview Client component for rendering the family vehicles list.
 */
import VehicleCard from '@/app/(app)/garage/components/cards/VehicleCard';
import Icon from '@/components/common/ui/Icon';
import SectionHeader from '@/components/common/ui/SectionHeader';

import type { FamilyMemberDisplay } from '@/types/family';
import type { Vehicle } from '@/types/vehicle';

interface FamilyVehiclesListProps {
  familyName: string;
  vehicles: Vehicle[];
  familyMembers: FamilyMemberDisplay[];
  onVehicleClick: (vehicle: Vehicle) => void;
}

export function FamilyVehiclesList({
  familyName,
  vehicles,
  familyMembers,
  onVehicleClick,
}: FamilyVehiclesListProps) {
  // Helper to get owner info for a family vehicle
  const getOwnerInfo = (vehicle: Vehicle) => {
    if (!vehicle.owner_id || !familyMembers) return null;
    const member = familyMembers.find((m) => m.user_id === vehicle.owner_id);
    if (!member) return null;
    return {
      user_id: member.user_id,
      user_name: member.user_name,
      avatar_url: member.avatar_url,
    };
  };

  return (
    <section>
      <SectionHeader
        title={`Véhicules de ${familyName}`}
        icon={<Icon name="family" size={16} />}
        count={vehicles.length}
        className="mb-6"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => {
          const ownerInfo = getOwnerInfo(vehicle);
          return (
            <VehicleCard
              key={vehicle.vehicle_id}
              vehicle={vehicle}
              onClick={onVehicleClick}
              isFamilyVehicle={true}
              owner={ownerInfo || undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
