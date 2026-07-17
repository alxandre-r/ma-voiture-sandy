import type { Attachment } from '@/types/attachment';

// User type definition based on the "users_info" view in Supabase.
export interface Vehicle {
  vehicle_id: number;
  owner_id?: string | null;
  owner_name?: string | null;
  family_ids?: string[] | null;
  name?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  fuel_type?: string | null;
  odometer?: number | null;
  plate?: string | null;
  created_at?: string | null;
  last_fill_date: string | null; // timestamptz
  calculated_consumption?: number | null; // L/100km (calculated from fills)
  co2_emission?: number | null; // g/km, official homologated value from technical sheet

  // New fields from garage_model
  status?: 'active' | 'sold' | 'archived' | null;
  vin?: string | null;
  transmission?: 'manual' | 'automatic' | null;
  image?: string | null;
  insurance_start_date?: string | null;
  insurance_monthly_cost?: number | null;
  tech_control_expiry?: string | null;
  financing_mode?: 'owned' | 'lld' | 'loa' | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  attachments?: Attachment[];
  permission_level?: 'read' | 'write' | null;
}

// Owner info for family vehicles display
export interface VehicleOwner {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
}

export interface VehicleMinimal {
  vehicle_id: number;
  owner_id?: string | null;
  owner_name?: string | null;
  family_ids?: string[] | null;
  name?: string | null;
  make?: string | null;
  model?: string | null;
  odometer?: number | null;
  color?: string | null;
  // Added for EV support
  fuel_type?: string | null;
  // Added for filtering active vehicles
  status?: 'active' | 'sold' | 'archived' | null;
  permission_level?: 'read' | 'write' | null;
}
