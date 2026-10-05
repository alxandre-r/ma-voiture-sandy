/**
 * Client-side vehicle rights, on rows that carry `owner_id` and `permission_level`
 * (vehicle lists from `lib/data/vehicles`). Server routes check rights on existing rows with
 * `lib/api/vehicleAccess.ts`.
 */
interface VehicleRights {
  owner_id?: string | null;
  permission_level?: string | null;
}

interface VehicleStatus {
  status?: string | null;
}

/** The vehicle's owner, or a family member with the `write` permission. */
export function canWriteVehicle(
  vehicle: VehicleRights | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!vehicle) return false;
  return (!!userId && vehicle.owner_id === userId) || vehicle.permission_level === 'write';
}

/** Not sold or archived (a null status is a legacy active vehicle). */
export function isActiveVehicle(vehicle: VehicleStatus): boolean {
  return vehicle.status === 'active' || vehicle.status == null;
}

/** The vehicles the user can add expenses to: active and writable. */
export function writableActiveVehicles<T extends VehicleRights & VehicleStatus>(
  vehicles: T[],
  userId: string | null | undefined,
): T[] {
  return vehicles.filter((v) => isActiveVehicle(v) && canWriteVehicle(v, userId));
}
