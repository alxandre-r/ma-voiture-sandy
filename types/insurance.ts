import type { Attachment } from '@/types/attachment';

export interface InsuranceContract {
  id: number;
  vehicle_id: number;
  owner_id: string;
  monthly_cost: number;
  start_date: string;
  end_date: string | null;
  provider: string | null;
  attachments?: Attachment[];
}

/** Writable fields of a contract (API payloads, demo ops). */
export interface InsuranceContractInput {
  vehicle_id: number;
  monthly_cost: number;
  start_date: string;
  end_date: string | null;
  provider: string | null;
}

/** SSR insurance payload: visible contracts plus family vehicles whose owner hides insurance. */
export interface InsuranceData {
  contracts: InsuranceContract[];
  hiddenVehicleIds: number[];
}

export interface InsuranceFormData {
  provider: string;
  monthly_cost: number | string;
  start_date: string;
  end_date: string;
}
