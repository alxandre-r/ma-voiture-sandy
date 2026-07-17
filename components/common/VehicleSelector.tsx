'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useMemo } from 'react';

import Icon from '@/components/common/ui/Icon';
import { useSelectors } from '@/contexts/SelectorsContext';
import { useUser } from '@/contexts/UserContext';

import type { VehicleMinimal } from '@/types/vehicle';

interface VehicleSelectorProps {
  value: number[];
  onChange: (vehicleIds: number[]) => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function vehicleDisplayName(v: VehicleMinimal): string {
  return v.name || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule';
}

function VehicleColorDot({ color }: { color?: string | null }) {
  const isHex = color?.startsWith('#');
  const isRgb = color?.startsWith('rgb');
  const style = isHex || isRgb ? { backgroundColor: color! } : undefined;
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600"
      style={style}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Trigger label                                                        */
/* ------------------------------------------------------------------ */

function useTriggerLabel(
  value: number[],
  vehicles: VehicleMinimal[],
  userId: string | undefined,
  familyNames: Map<string, string>,
): string {
  return useMemo(() => {
    if (value.length === 0) return 'Aucun véhicule';
    if (value.length === vehicles.length) return 'Tous les véhicules';

    const myVehicles = vehicles.filter((v) => v.owner_id === userId);
    if (
      myVehicles.length > 0 &&
      value.length === myVehicles.length &&
      myVehicles.every((v) => value.includes(v.vehicle_id))
    ) {
      return 'Mes véhicules';
    }

    // Check if the selection exactly matches one family
    for (const [familyId, familyName] of familyNames.entries()) {
      const familyVehicles = vehicles.filter((v) => v.family_ids?.includes(familyId));
      if (
        familyVehicles.length > 0 &&
        value.length === familyVehicles.length &&
        familyVehicles.every((v) => value.includes(v.vehicle_id))
      ) {
        return familyName;
      }
    }

    if (value.length === 1) {
      const v = vehicles.find((v) => v.vehicle_id === value[0]);
      return v ? vehicleDisplayName(v) : 'Véhicule';
    }

    return `${value.length} véhicules`;
  }, [value, vehicles, userId, familyNames]);
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export default function VehicleSelector({
  value,
  onChange,
  disabled = false,
}: VehicleSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { vehicles, families } = useSelectors();
  const user = useUser();
  const userId = user?.id;

  const hasOnlyOneVehicle = vehicles.length === 1;

  const familyNames = useMemo(() => new Map(families.map((f) => [f.id, f.name])), [families]);

  const label = useTriggerLabel(value, vehicles, userId, familyNames);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="vehicleSelector-Button relative w-full sm:w-auto">
      <button
        type="button"
        disabled={disabled || hasOnlyOneVehicle}
        onClick={() => {
          if (!hasOnlyOneVehicle && !disabled) setOpen((o) => !o);
        }}
        className={`flex items-center justify-between w-full gap-2
          px-3 py-2 rounded-lg text-xs font-medium
          border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          sm:min-w-[160px] min-w-[120px]
          transition-colors
          ${open ? 'border-custom-1 ring-1 ring-custom-1/30' : ''}
          ${hasOnlyOneVehicle || disabled ? 'cursor-default opacity-60' : 'hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'}`}
      >
        <span className="truncate">{label}</span>
        {!hasOnlyOneVehicle && !disabled && (
          <Icon
            name="arrow-down"
            size={14}
            className={`shrink-0 transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="absolute z-50 mt-2 left-0 w-[360px]
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-2xl shadow-xl shadow-black/10 overflow-hidden"
          >
            <VehicleDropdown
              vehicles={vehicles}
              families={families}
              familyNames={familyNames}
              value={value}
              userId={userId}
              onChange={onChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown content                                                     */
/* ------------------------------------------------------------------ */

function VehicleDropdown({
  vehicles,
  families,
  value,
  userId,
  onChange,
}: {
  vehicles: VehicleMinimal[];
  families: { id: string; name: string }[];
  familyNames: Map<string, string>;
  value: number[];
  userId: string | undefined;
  onChange: (ids: number[]) => void;
}) {
  const allIds = vehicles.map((v) => v.vehicle_id);
  const myVehicles = vehicles.filter((v) => v.owner_id === userId);
  const myIds = myVehicles.map((v) => v.vehicle_id);

  const allSelected = value.length === allIds.length && allIds.length > 0;
  const mySelected =
    myIds.length > 0 && value.length === myIds.length && myIds.every((id) => value.includes(id));

  // One group per family the user belongs to
  const familyGroups = useMemo(
    () =>
      families.map((f) => ({
        id: f.id,
        name: f.name,
        vehicles: vehicles.filter((v) => v.family_ids?.includes(f.id)),
      })),
    [families, vehicles],
  );

  const hasFamilies = familyGroups.length > 0;
  const showGroupCards = vehicles.length > 1;

  const toggleVehicle = (id: number) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="p-3">
      {/* Quick-select cards */}
      {showGroupCards && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Tous */}
            <GroupCard
              label="Tous les véhicules"
              subtitle={`${allIds.length} véhicule${allIds.length > 1 ? 's' : ''}`}
              icon="garage"
              active={allSelected}
              onClick={() => onChange(allSelected ? [] : allIds)}
            />

            {/* Mes véhicules */}
            {myIds.length > 0 && (
              <GroupCard
                label="Mes véhicules"
                subtitle={`${myIds.length} véhicule${myIds.length > 1 ? 's' : ''}`}
                icon="user"
                active={mySelected}
                onClick={() => onChange(mySelected ? [] : myIds)}
              />
            )}

            {/* One card per family */}
            {familyGroups.map((g) => {
              const gIds = g.vehicles.map((v) => v.vehicle_id);
              const gActive =
                gIds.length > 0 &&
                value.length === gIds.length &&
                gIds.every((id) => value.includes(id));
              return (
                <GroupCard
                  key={g.id}
                  label={g.name}
                  subtitle={`${g.vehicles.length} véhicule${g.vehicles.length > 1 ? 's' : ''}`}
                  icon="family"
                  active={gActive}
                  onClick={() => onChange(gActive ? [] : gIds)}
                />
              );
            })}
          </div>

          <div className="mx-0.5 mb-3 border-t border-gray-100 dark:border-gray-700" />
        </>
      )}

      {/* Individual vehicle list, grouped by family */}
      <div className="space-y-0.5 max-h-52 overflow-y-auto">
        {/* My vehicles section */}
        {myVehicles.length > 0 && (
          <>
            {hasFamilies && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 pb-1">
                Mes véhicules
              </p>
            )}
            {myVehicles.map((v) => (
              <VehicleRow
                key={v.vehicle_id}
                vehicle={v}
                checked={value.includes(v.vehicle_id)}
                onToggle={() => toggleVehicle(v.vehicle_id)}
              />
            ))}
          </>
        )}

        {/* Family sections */}
        {familyGroups.map((g) => {
          // Only show vehicles not already listed under "Mes véhicules"
          const familyOnlyVehicles = g.vehicles.filter((v) => v.owner_id !== userId);
          if (familyOnlyVehicles.length === 0) return null;
          return (
            <div key={g.id}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 pt-2 pb-1">
                {g.name}
              </p>
              {familyOnlyVehicles.map((v) => (
                <VehicleRow
                  key={v.vehicle_id}
                  vehicle={v}
                  checked={value.includes(v.vehicle_id)}
                  onToggle={() => toggleVehicle(v.vehicle_id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Group quick-select card                                              */
/* ------------------------------------------------------------------ */

function GroupCard({
  label,
  subtitle,
  active,
  onClick,
}: {
  label: string;
  subtitle: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start text-left px-3 py-2.5 rounded-xl
        transition-all duration-150 hover:cursor-pointer
        ${
          active
            ? 'bg-custom-2 shadow-sm'
            : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
      <span
        className={`text-sm font-semibold leading-tight truncate w-full ${active ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}
      >
        {label}
      </span>
      <span
        className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'}`}
      >
        {subtitle}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Individual vehicle row                                               */
/* ------------------------------------------------------------------ */

function VehicleRow({
  vehicle,
  checked,
  onToggle,
}: {
  vehicle: VehicleMinimal;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-xl
        text-left transition-all duration-150 hover:cursor-pointer
        ${checked ? 'bg-custom-2/10 dark:bg-custom-2/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
    >
      {/* Checkbox */}
      <span
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
          ${checked ? 'bg-custom-2 border-custom-2' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            className="w-2.5 h-2 fill-none stroke-white stroke-[2] stroke-linecap-round stroke-linejoin-round"
          >
            <path d="M1 4l2.5 2.5L9 1" />
          </svg>
        )}
      </span>

      <VehicleColorDot color={vehicle.color} />

      <span
        className={`text-sm truncate ${checked ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}
      >
        {vehicleDisplayName(vehicle)}
      </span>

      {(vehicle.fuel_type === 'Électrique' || vehicle.fuel_type === 'Hybride rechargeable') && (
        <span className="ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          EV
        </span>
      )}
    </button>
  );
}
