import { getUserFamilyIds } from '../user/getUserFamilyIds';

import { getFamilyVehicles, getFamilyVehiclesMinimal } from './getFamilyVehicles';
import { getUserVehicles, getUserVehiclesMinimal } from './getUserVehicles';

/**
 * Family vehicles that are not already in `own`, each kept once: a vehicle can be shared in
 * several of the user's families. Composes the guarded fetchers, so it works in demo mode as is.
 */
async function withFamilyVehicles<T extends { vehicle_id: number }>(
  getOwn: () => Promise<T[]>,
  getFamily: (familyId: string) => Promise<T[]>,
): Promise<{ ownedVehicles: T[]; familyVehicles: T[] }> {
  const [ownedVehicles, familyIds] = await Promise.all([getOwn(), getUserFamilyIds()]);
  if (!familyIds.length) return { ownedVehicles, familyVehicles: [] };

  // One argument only: cache() keys on every argument, map would also pass index and array
  const perFamily = await Promise.all(familyIds.map((id) => getFamily(id)));
  const seen = new Set(ownedVehicles.map((v) => v.vehicle_id));
  const familyVehicles = perFamily.flat().filter((v) => {
    if (seen.has(v.vehicle_id)) return false;
    seen.add(v.vehicle_id);
    return true;
  });
  return { ownedVehicles, familyVehicles };
}

/** The user's vehicles and the family vehicles shared with them, kept apart */
export function getOwnAndFamilyVehicles() {
  return withFamilyVehicles(getUserVehicles, getFamilyVehicles);
}

export async function getAllVehicles() {
  const { ownedVehicles, familyVehicles } = await getOwnAndFamilyVehicles();
  return [...ownedVehicles, ...familyVehicles];
}

export async function getAllVehiclesMinimal() {
  const { ownedVehicles, familyVehicles } = await withFamilyVehicles(
    getUserVehiclesMinimal,
    getFamilyVehiclesMinimal,
  );
  return [...ownedVehicles, ...familyVehicles];
}
