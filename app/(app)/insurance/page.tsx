import { redirect } from 'next/navigation';

import { getInsuranceData } from '@/lib/data/insurance/getInsuranceData';
import { getOwnAndFamilyVehicles } from '@/lib/data/vehicles';

import AssuranceClient from './AssuranceClient';

export default async function AssurancePage() {
  const { ownedVehicles, familyVehicles } = await getOwnAndFamilyVehicles();

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
