import type { Attachment } from '@/types/attachment';

// Represents a single fuel fill-up entry.
export interface Fill {
  id?: number;
  expense_id?: number;
  vehicle_id: number;
  owner: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  liters: number;
  amount: number;
  price_per_liter: number;
  notes?: string | null;
  created_at?: string;

  // Electric vehicle charge fields
  charge_type?: 'fill' | 'charge' | null; // 'fill' = fuel, 'charge' = electric
  kwh?: number | null; // kilowatt-hours for electric vehicles
  price_per_kwh?: number | null; // price per kWh for electric vehicles

  // Vehicle info (from fills_for_display view)
  vehicle_name?: string | null;
  fuel_type?: string | null; // Vehicle fuel type code (see lib/utils/vehicleEnergy.ts)

  attachments?: Attachment[];
}

// Form data structure for submitting a fill
export interface FillFormData {
  vehicle_id: number;
  date: string;
  odometer: number;
  liters: number;
  amount: number | null;
  price_per_liter: number | null;
  notes?: string;
  // Electric vehicle fields
  charge_type?: 'fill' | 'charge';
  kwh?: number;
  price_per_kwh?: number;
}

// Computed statistics for fills
export interface FillStats {
  total_fills: number;
  total_charges: number; // Electric vehicle charges
  total_liters: number;
  total_kwh: number; // Electric vehicle kWh
  total_cost: number;
  avg_price_per_liter: number;
  avg_price_per_kwh: number;
  avg_consumption: number; // L/100km or kWh/100km for EV
  last_fill_date: string | null;
  last_charge_date: string | null;
  last_odometer: number | null;
  monthly_chart: Array<{
    month: string;
    amount: number;
    count: number;
    odometer: number | null;
  }>;
}
