import { differenceInDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { addDaysIso, addMonthsIso, daysBetweenIso } from '@/lib/utils/isoDate';

import type { InsuranceContract, InsuranceData } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

export function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getActiveContract(contracts: InsuranceContract[]): InsuranceContract | null {
  const today = getTodayMidnight();
  return contracts.find((c) => !c.end_date || parseISO(c.end_date) >= today) ?? null;
}

export function getHistoricalContracts(contracts: InsuranceContract[]): InsuranceContract[] {
  const active = getActiveContract(contracts);
  return contracts.filter((c) => c.id !== active?.id);
}

/** Returns the number of days until a contract's end_date. Negative = already expired. */
export function getDaysUntilExpiry(contract: InsuranceContract): number | null {
  if (!contract.end_date) return null;
  return differenceInDays(parseISO(contract.end_date), getTodayMidnight());
}

/** Next monthly payment date based on the day-of-month from start_date. Always in the future. */
export function getNextMonthlyPaymentDate(startDate: string): Date {
  const dayOfMonth = parseISO(startDate).getDate();
  const today = getTodayMidnight();
  const candidate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (candidate <= today) {
    return new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  }
  return candidate;
}

/** Suggested start date for a new contract: day after the most recent contract's end_date, or today. */
export function getSuggestedStartDate(contracts: InsuranceContract[]): string {
  const todayStr = new Date().toISOString().split('T')[0];
  if (contracts.length === 0) return todayStr;
  const sorted = [...contracts].sort(
    (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime(),
  );
  const last = sorted[0];
  if (!last.end_date) return todayStr;
  const next = parseISO(last.end_date);
  next.setDate(next.getDate() + 1);
  return next.toISOString().split('T')[0];
}

export function formatInsuranceDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

// ── Single insurance status model (dates are YYYY-MM-DD strings, today passed explicitly) ──

export type ContractPeriod = Pick<InsuranceContract, 'start_date' | 'end_date'>;
export type ContractStatus = 'upcoming' | 'active' | 'ended';
export type VehicleInsuranceState = 'insured' | 'expiring' | 'upcoming_only' | 'uninsured';

export interface VehicleInsuranceStatus {
  state: VehicleInsuranceState;
  current: InsuranceContract | null;
  upcoming: InsuranceContract | null;
  daysUntilEnd: number | null;
}

export const EXPIRING_THRESHOLD_DAYS = 30;
/** Upper bound for monthly loops (100 years). */
const MAX_MONTHS = 1200;

export function getContractStatus(contract: ContractPeriod, today: string): ContractStatus {
  if (contract.start_date > today) return 'upcoming';
  if (contract.end_date !== null && contract.end_date < today) return 'ended';
  return 'active';
}

export function sortByStartDesc<T extends ContractPeriod & { id: number }>(contracts: T[]): T[] {
  return [...contracts].sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id);
}

export function getVehicleInsuranceStatus(
  contracts: InsuranceContract[],
  today: string,
): VehicleInsuranceStatus {
  const sorted = sortByStartDesc(contracts);
  const current = sorted.find((c) => getContractStatus(c, today) === 'active') ?? null;
  const upcoming =
    [...sorted].reverse().find((c) => getContractStatus(c, today) === 'upcoming') ?? null;
  const daysUntilEnd = current?.end_date ? daysBetweenIso(today, current.end_date) : null;

  let state: VehicleInsuranceState;
  if (current) {
    const takenOver =
      upcoming !== null &&
      current.end_date !== null &&
      upcoming.start_date === addDaysIso(current.end_date, 1);
    state =
      daysUntilEnd !== null && daysUntilEnd <= EXPIRING_THRESHOLD_DAYS && !takenOver
        ? 'expiring'
        : 'insured';
  } else {
    state = upcoming ? 'upcoming_only' : 'uninsured';
  }
  return { state, current, upcoming, daysUntilEnd };
}

export function isCovered(status: VehicleInsuranceStatus): boolean {
  return status.state === 'insured' || status.state === 'expiring';
}

export function contractsOf(insurance: InsuranceData, vehicleId: number): InsuranceContract[] {
  return insurance.contracts.filter((c) => c.vehicle_id === vehicleId);
}

/**
 * Single input for computeHealthScore's `hasActiveInsurance`.
 * undefined = no insurance factor (owner hides insurance, or vehicle not in service).
 */
export function getHasActiveInsurance(
  insurance: InsuranceData,
  vehicle: Pick<Vehicle, 'vehicle_id' | 'status'>,
  today: string,
): boolean | undefined {
  if (vehicle.status && vehicle.status !== 'active') return undefined;
  if (insurance.hiddenVehicleIds.includes(vehicle.vehicle_id)) return undefined;
  return isCovered(getVehicleInsuranceStatus(contractsOf(insurance, vehicle.vehicle_id), today));
}

/** Next instalment (start_date + n months, clamped) on or after today; null past end_date. */
export function getNextPaymentDate(contract: ContractPeriod, today: string): string | null {
  for (let i = 0; i < MAX_MONTHS; i += 1) {
    const date = addMonthsIso(contract.start_date, i);
    if (date < today) continue;
    return contract.end_date !== null && date > contract.end_date ? null : date;
  }
  return null;
}

export type BadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export function getInsuranceBadge(
  status: VehicleInsuranceStatus,
  vehicleActive: boolean,
): { label: string; tone: BadgeTone } {
  switch (status.state) {
    case 'insured':
      return status.upcoming
        ? { label: `Changement le ${formatInsuranceDate(status.upcoming.start_date)}`, tone: 'info' }
        : { label: 'Assuré', tone: 'success' };
    case 'expiring':
      return {
        label:
          status.daysUntilEnd === 0 ? "Expire aujourd'hui" : `Expire dans ${status.daysUntilEnd} j`,
        tone: 'warning',
      };
    case 'upcoming_only':
      return {
        label: `À partir du ${formatInsuranceDate(status.upcoming?.start_date)}`,
        tone: 'info',
      };
    default:
      return { label: 'Non assuré', tone: vehicleActive ? 'danger' : 'neutral' };
  }
}
