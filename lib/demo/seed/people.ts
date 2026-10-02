import {
  DEMO_DAUGHTER_ID,
  DEMO_FAMILY_ID,
  DEMO_INVITE_TOKEN,
  DEMO_PARTNER_ID,
  DEMO_USER_ID,
  DEMO_VEHICLE,
} from '../constants';
import { addDays, addMonths, toTimestamp } from '../dates';

import type { DemoFamily, DemoFamilyMember, DemoPermission, DemoUser } from '../types';
import type { UserPreferences } from '@/types/userPreferences';

export function seedUsers(today: string): DemoUser[] {
  const joined = addMonths(today, -26);
  return [
    {
      id: DEMO_USER_ID,
      email: 'camille.durand@example.com',
      name: 'Camille Durand',
      avatar_url: null,
      created_at: toTimestamp(joined, '09:12:00'),
    },
    {
      id: DEMO_PARTNER_ID,
      email: 'thomas.durand@example.com',
      name: 'Thomas Durand',
      avatar_url: null,
      created_at: toTimestamp(addDays(joined, 3), '20:41:00'),
    },
    {
      id: DEMO_DAUGHTER_ID,
      email: 'lea.durand@example.com',
      name: 'Léa Durand',
      avatar_url: null,
      created_at: toTimestamp(addMonths(today, -24), '18:05:00'),
    },
  ];
}

export function seedFamily(today: string): {
  families: DemoFamily[];
  familyMembers: DemoFamilyMember[];
} {
  const created = addMonths(today, -25);
  return {
    families: [
      {
        id: DEMO_FAMILY_ID,
        name: 'Famille Durand',
        owner_id: DEMO_USER_ID,
        invite_token: DEMO_INVITE_TOKEN,
        created_at: toTimestamp(created, '19:30:00'),
      },
    ],
    familyMembers: [
      {
        family_id: DEMO_FAMILY_ID,
        user_id: DEMO_USER_ID,
        role: 'owner',
        joined_at: toTimestamp(created, '19:30:00'),
      },
      {
        family_id: DEMO_FAMILY_ID,
        user_id: DEMO_PARTNER_ID,
        role: 'member',
        joined_at: toTimestamp(addDays(created, 2), '21:02:00'),
      },
      {
        family_id: DEMO_FAMILY_ID,
        user_id: DEMO_DAUGHTER_ID,
        role: 'member',
        joined_at: toTimestamp(addMonths(today, -24), '18:20:00'),
      },
    ],
  };
}

export function seedPermissions(): DemoPermission[] {
  return [
    { vehicle_id: DEMO_VEHICLE.peugeot308, user_id: DEMO_PARTNER_ID, permission_level: 'write' },
    { vehicle_id: DEMO_VEHICLE.peugeot308, user_id: DEMO_DAUGHTER_ID, permission_level: 'read' },
    { vehicle_id: DEMO_VEHICLE.zoe, user_id: DEMO_PARTNER_ID, permission_level: 'write' },
    { vehicle_id: DEMO_VEHICLE.zoe, user_id: DEMO_DAUGHTER_ID, permission_level: 'read' },
    { vehicle_id: DEMO_VEHICLE.niro, user_id: DEMO_USER_ID, permission_level: 'write' },
    { vehicle_id: DEMO_VEHICLE.niro, user_id: DEMO_DAUGHTER_ID, permission_level: 'read' },
    { vehicle_id: DEMO_VEHICLE.peugeot208, user_id: DEMO_USER_ID, permission_level: 'read' },
    { vehicle_id: DEMO_VEHICLE.peugeot208, user_id: DEMO_PARTNER_ID, permission_level: 'read' },
  ];
}

/** Old, fixed updated_at: a visitor's own localStorage never conflicts with demo preferences. */
const PREFS_UPDATED_AT = '2024-01-01T00:00:00.000Z';

export function seedPreferences(today: string): UserPreferences[] {
  // 'Cette année' is almost empty in January/February: fall back to 'Tout'.
  const month = Number(today.slice(5, 7));
  const base = {
    show_consumption: true,
    show_insurance: true,
    show_vehicle_details: true,
    show_financials: true,
    default_vehicle_scope: 'all' as const,
    created_at: PREFS_UPDATED_AT,
    updated_at: PREFS_UPDATED_AT,
  };
  return [
    { ...base, user_id: DEMO_USER_ID, default_period: month <= 2 ? 'all' : 'year' },
    { ...base, user_id: DEMO_PARTNER_ID, default_period: 'month' },
    { ...base, user_id: DEMO_DAUGHTER_ID, default_period: 'month', show_financials: false },
  ];
}
