'use client';

/**
 * @file GarageVehiclesList.tsx
 * @fileoverview Client component for rendering the user's vehicles list.
 */
import VehicleCard from '@/app/(app)/garage/components/cards/VehicleCard';
import Icon from '@/components/common/ui/Icon';
import SectionHeader from '@/components/common/ui/SectionHeader';
import { getHasActiveInsurance } from '@/lib/utils/insuranceUtils';
import { getLocalToday } from '@/lib/utils/isoDate';

import type { InsuranceData } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

interface GarageVehiclesListProps {
  vehicles: Vehicle[];
  onVehicleClick: (vehicle: Vehicle) => void;
  onAddVehicle: () => void;
  insurance?: InsuranceData;
  onOdometerUpdate?: (vehicleId: number, value: number) => Promise<void>;
}

export function GarageVehiclesList({
  vehicles,
  onVehicleClick,
  onAddVehicle,
  insurance,
  onOdometerUpdate,
}: GarageVehiclesListProps) {
  const today = getLocalToday();
  return (
    <section>
      <div className="mb-6">
        <SectionHeader
          title="Mes véhicules"
          icon={<Icon name="car" size={16} />}
          count={vehicles.length}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.vehicle_id}
            vehicle={vehicle}
            onClick={onVehicleClick}
            hasActiveInsurance={insurance ? getHasActiveInsurance(insurance, vehicle, today) : undefined}
            onOdometerUpdate={onOdometerUpdate}
          />
        ))}

        {/* Add vehicle card */}
        <button
          onClick={onAddVehicle}
          className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-custom-2/50 hover:border-custom-2 hover:bg-custom-2/5 transition-colors cursor-pointer min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-custom-2/50 group-hover:border-custom-2 flex items-center justify-center transition-colors mb-3">
            <Icon
              name="add"
              size={24}
              className="text-custom-2 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <span className="text-sm font-medium text-custom-2 opacity-60 group-hover:opacity-100 transition-opacity">
            Ajouter un véhicule
          </span>
        </button>
      </div>
    </section>
  );
}
