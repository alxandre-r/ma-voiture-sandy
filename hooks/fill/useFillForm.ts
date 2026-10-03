import { useState, useEffect, useCallback } from 'react';

import { calculateFillValues } from '@/hooks/fill/useFillActions';
import { defaultChargeType, vehicleEnergy } from '@/lib/utils/vehicleEnergy';

import type { Fill, FillFormData } from '@/types/fill';
import type { VehicleMinimal } from '@/types/vehicle';

const NUMERIC_FIELDS = new Set([
  'amount',
  'liters',
  'price_per_liter',
  'kwh',
  'price_per_kwh',
  'odometer',
]);

function getVehicleFuelType(vehicles: VehicleMinimal[], vehicleId: number) {
  return vehicles.find((v) => v.vehicle_id === vehicleId)?.fuel_type ?? null;
}

function getAllowedTypes(fuelType: string | null) {
  const energy = vehicleEnergy(fuelType);
  return { fill: energy.fuel, charge: energy.electric };
}

function buildInitialFormData(
  initialFill: Fill | null | undefined,
  vehicles: VehicleMinimal[],
  preselectedVehicleId?: number,
  forcedType?: 'fill' | 'charge',
): FillFormData {
  const vehicleId =
    preselectedVehicleId ??
    initialFill?.vehicle_id ??
    (vehicles.length === 1 ? vehicles[0].vehicle_id : 0);

  const fuelType = getVehicleFuelType(vehicles, vehicleId);

  return {
    vehicle_id: vehicleId,
    date: initialFill?.date ?? new Date().toISOString().split('T')[0],
    odometer: initialFill?.odometer ?? 0,
    liters: initialFill?.liters ?? 0,
    amount: initialFill?.amount ?? null,
    price_per_liter: initialFill?.price_per_liter ?? null,
    notes: initialFill?.notes ?? '',
    charge_type: forcedType ?? initialFill?.charge_type ?? defaultChargeType(fuelType),
    kwh: initialFill?.kwh ?? 0,
    price_per_kwh: initialFill?.price_per_kwh ?? 0,
  };
}

export function useFillForm(
  vehicles: VehicleMinimal[],
  initialFill?: Fill | null,
  preselectedVehicleId?: number,
  forcedType?: 'fill' | 'charge',
) {
  const [formData, setFormData] = useState<FillFormData>(() =>
    buildInitialFormData(initialFill, vehicles, preselectedVehicleId, forcedType),
  );

  const fuelType = getVehicleFuelType(vehicles, formData.vehicle_id);
  const allowedTypes = getAllowedTypes(fuelType);
  const canChangeChargeType = allowedTypes.fill && allowedTypes.charge;
  const activeChargeType = formData.charge_type;
  const isElectric = activeChargeType === 'charge';

  // Sync odometer when vehicle changes (création uniquement)
  useEffect(() => {
    if (initialFill || !formData.vehicle_id) return;
    const vehicle = vehicles.find((v) => v.vehicle_id === formData.vehicle_id);
    if (vehicle?.odometer != null) {
      setFormData((prev) => ({ ...prev, odometer: vehicle.odometer! }));
    }
  }, [formData.vehicle_id, vehicles]);

  // Keep charge_type consistent with the menu choice (forcedType) or the vehicle's energy.
  // charge_type drives the calculation, the validation and the payload, so it must never lag.
  useEffect(() => {
    const newType =
      forcedType ??
      (formData.vehicle_id && !canChangeChargeType ? defaultChargeType(fuelType) : null);
    if (newType && formData.charge_type !== newType) {
      setFormData((prev) => calculateFillValues({ ...prev, charge_type: newType }, prev));
    }
  }, [forcedType, formData.vehicle_id, formData.charge_type, fuelType, canChangeChargeType]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;

      if (type === 'number' || NUMERIC_FIELDS.has(name)) {
        const parsed = value === '' ? null : parseFloat(value.replace(',', '.'));
        const numeric = Number.isNaN(parsed as number) ? null : parsed;
        setFormData((prev) => calculateFillValues({ ...prev, [name]: numeric }, prev));
        return;
      }

      setFormData((prev) => {
        const next = { ...prev, [name]: value } as FillFormData;
        return name === 'charge_type' ? next : calculateFillValues(next);
      });
    },
    [],
  );

  return {
    formData,
    handleChange,
    allowedTypes,
    canChangeChargeType,
    activeChargeType,
    isElectric,
  };
}
