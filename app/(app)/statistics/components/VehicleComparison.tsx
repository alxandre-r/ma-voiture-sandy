'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { CHART_FALLBACK_COLOR } from '@/lib/utils/chartColors';

interface VehicleData {
  vehicle_id?: number;
  name?: string;
  make?: string;
  model?: string;
  image?: string | null;
  plate?: string;
  color?: string;
  fuel_type?: string;
}

interface VehicleStat {
  vehicleId: number;
  vehicleName: string;
  vehicleColor: string;
  isElectric?: boolean;
  cost: number;
  percentage: number;
  vehicle?: VehicleData;
}

interface VehicleComparisonProps {
  vehicleStats: VehicleStat[];
  totalCost?: number;
}

export default function VehicleComparison({ vehicleStats, totalCost }: VehicleComparisonProps) {
  // Limit to max 3 vehicles
  const displayVehicles = vehicleStats.slice(0, 3);
  const total = totalCost || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparaison véhicules</CardTitle>
        <CardDescription>Coûts totaux</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayVehicles.map((vehicle, _index) => {
            const percentage = (vehicle.cost / total) * 100;
            const vehicleData = vehicle.vehicle;
            const barColor = vehicle.vehicleColor || CHART_FALLBACK_COLOR;

            return (
              <div
                key={vehicle.vehicleId}
                className="flex overflow-hidden border border-gray-100 hover:border-custom-1 dark:border-gray-700 dark:hover:border-custom-1 rounded-lg transition-colors"
              >
                {/* Vehicle Image - full left side */}
                <div className="relative w-24 shrink-0">
                  {vehicleData?.image ? (
                    <div
                      className="w-full h-[72px] bg-no-repeat bg-center bg-cover"
                      style={{ backgroundImage: `url(${vehicleData.image})` }}
                    />
                  ) : (
                    <div className="w-full h-[72px] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Icon name="car" size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-full h-[72px] bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                  <div
                    className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: vehicle.vehicleColor || CHART_FALLBACK_COLOR }}
                  ></div>
                </div>

                {/* Right side with progress bar background, vehicle info, and percentage */}
                <div className="flex-1 flex flex-col">
                  {/* Progress bar background (full width of right side) */}
                  <div
                    className="flex-1"
                    style={{
                      background: `linear-gradient(to right, ${barColor}15 0%, ${barColor}15 ${percentage}%, transparent ${percentage}%, transparent 100%)`,
                    }}
                  >
                    <div className="flex items-center justify-between p-3 h-full">
                      {/* Vehicle Info - left side */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {vehicleData?.make && vehicleData?.model
                            ? `${vehicleData.make} ${vehicleData.model}`
                            : vehicle.vehicleName}
                        </h4>
                        <p className="text-base font-bold text-custom-1 dark:text-custom-1">
                          {vehicle.cost.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      </div>

                      {/* Percentage - right side */}
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg ml-2 shrink-0">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar at bottom */}
                  <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-r-full"
                      style={{ width: `${percentage}%`, backgroundColor: barColor }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
