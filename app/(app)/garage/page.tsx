/**
 * @file app/(app)/garage/page.tsx
 * @fileoverview SSR page for the garage. Fetches data in parallel and passes it
 * to the client component. loading.tsx handles the navigation skeleton.
 */
import { getAllExpenses } from '@/lib/data/expenses/getAllExpenses';
import { getFamilyInfo, getFamilyMembers } from '@/lib/data/family';
import { getInsuranceData } from '@/lib/data/insurance/getInsuranceData';
import { getFamilyVisibilityPrefs } from '@/lib/data/user/getFamilyVisibilityPrefs';
import { getUserFamilyIds } from '@/lib/data/user/getUserFamilyIds';
import { getUserVehicles, getFamilyVehicles } from '@/lib/data/vehicles';

import GarageClient from './GarageClient';


export default async function GaragePage() {
  const [vehicles, familyIds] = await Promise.all([getUserVehicles(), getUserFamilyIds()]);

  const vehicleIds = vehicles.map((v) => v.vehicle_id);

  if (!familyIds.length) {
    const [expenses, insurance] = await Promise.all([
      vehicleIds.length > 0 ? getAllExpenses(vehicleIds) : Promise.resolve([]),
      getInsuranceData(vehicles),
    ]);
    return (
      <GarageClient
        userVehicles={vehicles}
        expenses={expenses ?? []}
        insurance={insurance}
      />
    );
  }

  // Fetch family vehicles, members and info for all families in parallel
  const [allFamilyVehiclesNested, allFamilyMembersNested, allFamilyInfos] = await Promise.all([
    Promise.all(familyIds.map((id) => getFamilyVehicles(id))),
    Promise.all(familyIds.map((id) => getFamilyMembers(id))),
    Promise.all(familyIds.map((id) => getFamilyInfo(id))),
  ]);

  // Build per-family groups, deduplicating vehicles across families
  const seenVehicleIds = new Set<number>();
  const familyGroups = familyIds
    .map((id, i) => ({
      familyId: id,
      familyName: allFamilyInfos[i]?.name ?? 'Famille',
      vehicles: allFamilyVehiclesNested[i].filter((v) => {
        if (seenVehicleIds.has(v.vehicle_id)) return false;
        seenVehicleIds.add(v.vehicle_id);
        return true;
      }),
    }))
    .filter((g) => g.vehicles.length > 0);

  const seenMemberIds = new Set<string>();
  const familyMembers = allFamilyMembersNested.flat().filter((m) => {
    if (seenMemberIds.has(m.user_id)) return false;
    seenMemberIds.add(m.user_id);
    return true;
  });

  const allFamilyVehicles = familyGroups.flatMap((g) => g.vehicles);
  const allVehicleIds = [...vehicleIds, ...allFamilyVehicles.map((v) => v.vehicle_id)];
  const [expenses, insurance] = await Promise.all([
    allVehicleIds.length > 0 ? getAllExpenses(allVehicleIds) : Promise.resolve([]),
    getInsuranceData([...vehicles, ...allFamilyVehicles]),
  ]);

  // Fetch preferences for all unique family vehicle owners (for visibility control)
  const uniqueOwnerIds = [
    ...new Set(allFamilyVehicles.map((v) => v.owner_id).filter(Boolean) as string[]),
  ];
  const familyOwnerPreferences = await getFamilyVisibilityPrefs(uniqueOwnerIds);

  return (
    <GarageClient
      userVehicles={vehicles}
      familyGroups={familyGroups}
      familyMembers={familyMembers}
      expenses={expenses ?? []}
      insurance={insurance}
      familyOwnerPreferences={familyOwnerPreferences}
    />
  );
}
