import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { addDaysIso, addMonthsIso, daysBetweenIso } from '@/lib/utils/isoDate';

import type { InsuranceContract, InsuranceContractInput, InsuranceData } from '@/types/insurance';
import type { Vehicle } from '@/types/vehicle';

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
        ? {
            label: `Changement le ${formatInsuranceDate(status.upcoming.start_date)}`,
            tone: 'info',
          }
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

// ── Write-side rules (shared by the API routes and the demo handlers) ──

export const INSURANCE_ERRORS = {
  costRequired: 'Le coût mensuel est requis',
  startRequired: 'La date de début est requise',
  effectiveRequired: "La date d'effet est requise",
  endBeforeStart: 'La date de fin doit être postérieure à la date de début',
  laterContractExists:
    'Un contrat commence déjà à cette date ou après. Modifiez-le ou supprimez-le.',
  /** DB constraint insurance_contracts_no_overlap (23P01), e.g. two concurrent requests */
  overlap: 'Ce contrat chevauche un autre contrat de ce véhicule.',
} as const;

/** Postgres exclusion_violation: insurance_contracts_no_overlap */
export const OVERLAP_VIOLATION = '23P01';

const OPEN_END = '9999-12-31';

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
}

const toCost = (value: unknown) =>
  value === null || value === undefined || value === '' ? NaN : Number(value);

export function validateContractInput(input: {
  monthly_cost: unknown;
  start_date: unknown;
  end_date?: unknown;
}): string | null {
  const cost = toCost(input.monthly_cost);
  if (!Number.isFinite(cost) || cost <= 0) return INSURANCE_ERRORS.costRequired;
  if (!isIsoDate(input.start_date)) return INSURANCE_ERRORS.startRequired;
  if (isIsoDate(input.end_date) && input.end_date.slice(0, 10) < input.start_date.slice(0, 10)) {
    return INSURANCE_ERRORS.endBeforeStart;
  }
  return null;
}

export function findOverlap<T extends ContractPeriod & { id: number }>(
  contracts: T[],
  candidate: ContractPeriod,
  excludeId?: number,
): T | null {
  const candidateEnd = candidate.end_date ?? OPEN_END;
  return (
    contracts.find(
      (c) =>
        c.id !== excludeId &&
        c.start_date <= candidateEnd &&
        candidate.start_date <= (c.end_date ?? OPEN_END),
    ) ?? null
  );
}

export function formatOverlapError(contract: ContractPeriod): string {
  const end = contract.end_date ? formatInsuranceDate(contract.end_date) : '—';
  return `Ce contrat chevauche le contrat du ${formatInsuranceDate(contract.start_date)} au ${end}.`;
}

/** Monthly instalment dates from start (start + n months, clamped) up to min(end, today). */
export function getInstalmentDates(start: string, end: string | null, today: string): string[] {
  const last = end !== null && end < today ? end : today;
  const dates: string[] = [];
  for (let i = 0; i < MAX_MONTHS; i += 1) {
    const date = addMonthsIso(start, i);
    if (date > last) break;
    dates.push(date);
  }
  return dates;
}

export interface ContractChangeInput {
  vehicle_id: number;
  monthly_cost: unknown;
  effective_date: unknown;
  provider?: unknown;
}

export type ContractChangePlan =
  | { ok: true; close: { id: number; end_date: string } | null; create: InsuranceContractInput }
  | { ok: false; status: 400 | 409; error: string };

/** "Changer de contrat": close the latest contract the day before, then open a new one. */
export function planContractChange(
  contracts: (ContractPeriod & { id: number; provider: string | null })[],
  input: ContractChangeInput,
): ContractChangePlan {
  if (!isIsoDate(input.effective_date)) {
    return { ok: false, status: 400, error: INSURANCE_ERRORS.effectiveRequired };
  }
  const effective = input.effective_date.slice(0, 10);
  const invalid = validateContractInput({
    monthly_cost: input.monthly_cost,
    start_date: effective,
  });
  if (invalid) return { ok: false, status: 400, error: invalid };
  if (contracts.some((c) => c.start_date >= effective)) {
    return { ok: false, status: 409, error: INSURANCE_ERRORS.laterContractExists };
  }

  const base = sortByStartDesc(contracts)[0] ?? null;
  const close =
    base && (base.end_date === null || base.end_date >= effective)
      ? { id: base.id, end_date: addDaysIso(effective, -1) }
      : null;
  const provider =
    (typeof input.provider === 'string' && input.provider.trim()) || base?.provider || null;

  return {
    ok: true,
    close,
    create: {
      vehicle_id: input.vehicle_id,
      monthly_cost: Number(input.monthly_cost),
      start_date: effective,
      end_date: null,
      provider,
    },
  };
}

/** Default date d'effet: the day after the latest contract's future end date, else today. */
export function getSuggestedEffectiveDate(contracts: InsuranceContract[], today: string): string {
  const latest = sortByStartDesc(contracts)[0];
  if (latest?.end_date && latest.end_date >= today) return addDaysIso(latest.end_date, 1);
  return today;
}
