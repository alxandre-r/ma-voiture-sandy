/**
 * @file lib/demo/types.ts
 * @description In-memory model of the demo. Mirrors the DB tables the views are built from.
 */

import type { Reminder } from '@/types/reminder';
import type { UserPreferences } from '@/types/userPreferences';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DemoFamily {
  id: string;
  name: string;
  owner_id: string;
  invite_token: string;
  created_at: string;
}

export interface DemoFamilyMember {
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface DemoVehicle {
  id: number;
  owner_id: string;
  name: string | null;
  make: string;
  model: string;
  year: number | null;
  fuel_type: string | null;
  created_at: string;
  odometer: number;
  plate: string | null;
  color: string | null;
  status: 'active' | 'sold' | 'archived';
  vin: string | null;
  transmission: 'manual' | 'automatic' | null;
  image: string | null;
  tech_control_expiry: string | null;
  financing_mode: 'owned' | 'lld' | 'loa' | null;
  purchase_date: string | null;
  purchase_price: number | null;
  co2_emission: number | null;
}

export interface DemoPermission {
  vehicle_id: number;
  user_id: string;
  permission_level: 'read' | 'write';
}

export interface DemoFillDetail {
  odometer: number | null;
  liters: number | null;
  price_per_liter: number | null;
  kwh: number | null;
  price_per_kwh: number | null;
  charge_type: 'fill' | 'charge';
}

export interface DemoMaintenanceDetail {
  maintenance_type_id: string | null;
  odometer: number | null;
  garage: string | null;
}

/** A stored expense. Insurance instalments are never stored: they are derived from contracts. */
export interface DemoExpense {
  id: number;
  vehicle_id: number;
  owner_id: string;
  type: 'fuel' | 'electric_charge' | 'maintenance' | 'other';
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  fill?: DemoFillDetail;
  maintenance?: DemoMaintenanceDetail;
  label?: string | null;
}

export interface DemoInsuranceContract {
  id: number;
  vehicle_id: number;
  owner_id: string;
  monthly_cost: number;
  start_date: string;
  end_date: string | null;
  provider: string | null;
}

export interface DemoMaintenanceType {
  label_fr: string;
  interval_km: number | null;
  interval_months: number | null;
}

export interface DemoState {
  /** The day the state was built for (YYYY-MM-DD, UTC) */
  today: string;
  users: DemoUser[];
  families: DemoFamily[];
  familyMembers: DemoFamilyMember[];
  vehicles: DemoVehicle[];
  permissions: DemoPermission[];
  expenses: DemoExpense[];
  insuranceContracts: DemoInsuranceContract[];
  reminders: Reminder[];
  preferences: UserPreferences[];
  maintenanceTypes: Record<string, DemoMaintenanceType>;
}
