import { redirect } from 'next/navigation';

import { getInsuranceData } from '@/lib/data/insurance/getInsuranceData';
import { getUserFamilyIds } from '@/lib/data/user/getUserFamilyIds';
import { getFamilyVehicles, getUserVehicles } from '@/lib/data/vehicles';

import AssuranceClient from './AssuranceClient';

export default async function AssurancePage() {
  const [ownedVehicles, familyIds] = await Promise.all([getUserVehicles(), getUserFamilyIds()]);

  const seenIds = new Set<number>(ownedVehicles.map((v) => v.vehicle_id));
  const perFamily = await Promise.all(familyIds.map((id) => getFamilyVehicles(id)));
  const familyVehicles = perFamily.flat().filter((v) => {
    if (seenIds.has(v.vehicle_id)) return false;
    seenIds.add(v.vehicle_id);
    return true;
  });

  if (ownedVehicles.length + familyVehicles.length === 0) redirect('/garage');

  const insurance = await getInsuranceData([...ownedVehicles, ...familyVehicles]);

  return (
    <main>
      <AssuranceClient
        ownedVehicles={ownedVehicles}
        familyVehicles={familyVehicles}
        insurance={insurance}
      />
    </main>
  );
}
