'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { formatDate } from '@/lib/utils/format';
import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import type { Expense } from '@/types/expense';
import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

function getTechControlStatus(expiry: string | null | undefined): {
  label: string;
  dot: string;
} {
  if (!expiry) return { label: '—', dot: 'bg-gray-300 dark:bg-gray-600' };

  const now = new Date();
  const date = new Date(expiry);
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'CT expirée', dot: 'bg-red-500' };
  if (diffDays <= 30) return { label: `CT dans ${diffDays}j`, dot: 'bg-orange-400' };
  if (diffDays <= 90) return { label: `CT dans ${diffDays}j`, dot: 'bg-yellow-400' };
  return { label: `CT ${formatDate(expiry)}`, dot: 'bg-green-500' };
}

function VehicleRow({
  vehicle,
  reminders,
  expenses,
  hasActiveInsurance,
}: {
  vehicle: Vehicle;
  reminders?: Reminder[];
  expenses?: Expense[];
  hasActiveInsurance?: boolean;
}) {
  const vehicleName =
    (vehicle.name ?? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()) || 'Véhicule';
  const isElectric = vehicle.fuel_type === 'electric';
  const techStatus = getTechControlStatus(vehicle.tech_control_expiry);
  const health = computeHealthScore(vehicle, { reminders, expenses, hasActiveInsurance });

  const subtitleParts = [vehicle.plate, vehicle.fuel_type, vehicle.year?.toString()].filter(
    Boolean,
  );

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Link href={`/garage?vehicleId=${vehicle.vehicle_id}`} className="flex items-center gap-4 w-full">
        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
          {vehicle.image ? (
            <Image src={vehicle.image} alt={vehicleName} fill className="object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: vehicle.color ? `${vehicle.color}22` : undefined }}
            >
              <Icon name="car" size={24} className="opacity-40" />
            </div>
          )}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {vehicleName}
            </p>
            {vehicle.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50 dark:border-gray-700"
                style={{ backgroundColor: vehicle.color }}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {subtitleParts.join(' · ') || '—'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${techStatus.dot}`} />
            <span className="text-xs text-gray-400 dark:text-gray-500">{techStatus.label}</span>
          </div>
        </div>

        {/* Odometer + Health score */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {vehicle.odometer != null ? vehicle.odometer.toLocaleString('fr-FR') : '—'}
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">km</span>
          </p>
          {vehicle.calculated_consumption != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {vehicle.calculated_consumption}&nbsp;{isElectric ? 'kWh' : 'L/100'}
            </p>
          )}
          {/* Health score badge */}
          <span
            title={`Score de suivi : ${health.score}/10`}
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${health.bgClass} ${health.textClass}`}
          >
            {health.grade}
            <span className="font-normal opacity-70">{health.score}</span>
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function VehicleQuickView({
  vehicles,
  reminders,
  expenses,
  activeInsuranceVehicleIds,
}: {
  vehicles: Vehicle[];
  reminders?: Reminder[];
  expenses?: Expense[];
  activeInsuranceVehicleIds?: number[];
}) {
  const active = vehicles.filter((v) => v.status === 'active' || v.status == null);
  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="car" size={18} />
          <CardTitle>Mes véhicules</CardTitle>
        </div>
        <Link href="/garage" className="text-sm font-medium text-custom-1 hover:underline">
          Voir tout
        </Link>
      </CardHeader>
      <CardContent>
        {active.map((vehicle) => (
          <VehicleRow
            key={vehicle.vehicle_id}
            vehicle={vehicle}
            reminders={reminders}
            expenses={expenses}
            hasActiveInsurance={activeInsuranceVehicleIds?.includes(vehicle.vehicle_id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
