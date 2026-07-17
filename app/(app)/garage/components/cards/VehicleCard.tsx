'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import ProfilePicture from '@/components/user/ProfilePicture';
import { computeHealthScore } from '@/lib/utils/vehicleHealthUtils';

import type { Vehicle } from '@/types/vehicle';

interface VehicleOwner {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: (vehicle: Vehicle) => void;
  isFamilyVehicle?: boolean;
  owner?: VehicleOwner;
  hasActiveInsurance?: boolean;
  onOdometerUpdate?: (vehicleId: number, value: number) => Promise<void>;
}

export default function VehicleCard({
  vehicle,
  onClick,
  isFamilyVehicle,
  owner,
  hasActiveInsurance,
  onOdometerUpdate,
}: VehicleCardProps) {
  const [isEditingOdo, setIsEditingOdo] = useState(false);
  const [odoInput, setOdoInput] = useState('');
  const [savingOdo, setSavingOdo] = useState(false);
  const escapeRef = useRef(false);

  const handleClick = () => {
    if (onClick) onClick(vehicle);
  };

  const startEditOdo = () => {
    setOdoInput(String(vehicle.odometer ?? ''));
    setIsEditingOdo(true);
  };

  const handleOdoSave = async () => {
    if (escapeRef.current) {
      escapeRef.current = false;
      setIsEditingOdo(false);
      return;
    }
    const value = parseInt(odoInput, 10);
    if (isNaN(value) || value < 0 || value === vehicle.odometer) {
      setIsEditingOdo(false);
      return;
    }
    setSavingOdo(true);
    await onOdometerUpdate?.(vehicle.vehicle_id, value);
    setSavingOdo(false);
    setIsEditingOdo(false);
  };

  const handleOdoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      escapeRef.current = true;
      setIsEditingOdo(false);
    }
  };

  const vehicleImage = vehicle.image;
  const health = computeHealthScore(vehicle, { hasActiveInsurance });

  return (
    <div
      className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm
      dark:bg-gray-800 dark:border-gray-700
      hover:shadow-md transition-shadow hover:-trangray-y-1 hover:border-custom-1/70 cursor-pointer transition-transform"
      onClick={handleClick}
    >
      {/* Click to view details - the whole card is clickable */}
      <div className="aspect-video w-full relative">
        {vehicleImage ? (
          <Image
            className="h-full w-full object-cover"
            alt={`${vehicle.make} ${vehicle.model}`}
            src={vehicleImage}
            fill
          />
        ) : (
          <div className="h-full w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Icon name="car" size={48} />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-4 left-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white ${vehicle.status === 'active' ? 'bg-emerald-500/50' : 'bg-gray-500/40'} backdrop-blur-sm`}
          >
            {vehicle.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
        {/* Health score badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold backdrop-blur-sm ${health.bgClass} ${health.textClass}`}
            title={`Score de suivi : ${health.score}/10`}
          >
            <span>Score</span>
            <span className={`font-black tabular-nums ${health.textClass}`}>{health.score}</span>
            <span className="font-normal opacity-60 text-[10px]">/10</span>
          </span>
        </div>

        {/* Owner badge - only show for family vehicles */}
        {isFamilyVehicle && owner && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 dark:bg-gray-700 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
            <ProfilePicture
              avatarUrl={owner.avatar_url}
              name={owner.user_name}
              size="sm"
              className="w-6 h-6"
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 pr-1">
              {owner.user_name}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h4 className="font-bold text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-2">
              <span>
                {vehicle.make} {vehicle.model}
              </span>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: vehicle.color || '#64748b' }}
              ></div>
            </div>
          </h4>
          <span className="text-xs font-mono font-bold text-custom-1 bg-custom-1/10 px-2 py-0.5 rounded inline-block mt-1">
            {vehicle.plate || '—'}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Carburant</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {vehicle.fuel_type || '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Année</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {vehicle.year || '—'}
            </span>
          </div>

          {/* Kilométrage — inline editable */}
          <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Kilométrage</span>
            {onOdometerUpdate && isEditingOdo ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={odoInput}
                  onChange={(e) => setOdoInput(e.target.value)}
                  onKeyDown={handleOdoKeyDown}
                  onBlur={handleOdoSave}
                  autoFocus
                  disabled={savingOdo}
                  className="w-20 text-sm font-bold text-gray-700 dark:text-gray-300 bg-transparent border-b border-custom-1 outline-none disabled:opacity-50"
                />
                <span className="text-xs text-gray-400">km</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 group/odo ${onOdometerUpdate ? 'cursor-pointer' : ''}`}
                onClick={onOdometerUpdate ? startEditOdo : undefined}
              >
                <span
                  className={`text-sm font-bold text-gray-700 dark:text-gray-300 ${onOdometerUpdate ? 'group-hover/odo:text-custom-1 transition-colors' : ''}`}
                >
                  {vehicle.odometer?.toLocaleString() || '—'} km
                </span>
                {onOdometerUpdate && (
                  <Icon
                    name="pencil"
                    size={11}
                    className="opacity-0 group-hover/odo:opacity-50 transition-opacity text-gray-400"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Consommation</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {vehicle.calculated_consumption ? `${vehicle.calculated_consumption} L/100` : '—'}
            </span>
          </div>
          {vehicle.co2_emission != null && (
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                <Image src="icons/leaf-green.svg" alt="CO₂" width={14} height={14} />
                CO₂ homologué
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-600">
                {vehicle.co2_emission} g/km
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
