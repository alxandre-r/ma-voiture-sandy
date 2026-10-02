/**
 * @file lib/demo/seed/index.ts
 * @description Deterministic demo dataset. Same output for the same day; dates slide with today.
 */

import { createRandom } from '../random';

import { seedFleet } from './fleet';
import { seedInsuranceContracts } from './insurance';
import { DEMO_MAINTENANCE_TYPES, seedMaintenance } from './maintenance';
import { seedOtherExpenses } from './otherExpenses';
import { seedFamily, seedPermissions, seedPreferences, seedUsers } from './people';
import { seedReminders } from './reminders';

import type { DemoState } from '../types';

export { DEMO_MAINTENANCE_TYPES } from './maintenance';

const DEMO_RANDOM_SEED = 42;

export function buildDemoSeed(today: string): DemoState {
  const random = createRandom(DEMO_RANDOM_SEED);
  const fleet = seedFleet(today, random);
  const maintenance = seedMaintenance(today, fleet);
  const { families, familyMembers } = seedFamily(today);

  return {
    today,
    users: seedUsers(today),
    families,
    familyMembers,
    vehicles: fleet.vehicles,
    permissions: seedPermissions(),
    expenses: [...fleet.energy, ...maintenance, ...seedOtherExpenses(today)],
    insuranceContracts: seedInsuranceContracts(today),
    reminders: seedReminders(today, maintenance),
    preferences: seedPreferences(today),
    maintenanceTypes: Object.fromEntries(
      Object.entries(DEMO_MAINTENANCE_TYPES).map(([id, type]) => [id, { ...type }]),
    ),
  };
}
