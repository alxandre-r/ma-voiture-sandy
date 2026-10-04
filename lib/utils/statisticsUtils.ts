/**
 * @file lib/utils/statisticsUtils.ts
 * @description Pure computation functions for statistics. No React dependencies —
 * all functions are deterministic and fully testable in isolation.
 */

import { EXPENSE_CATEGORIES } from '@/app/(app)/expenses/components/expenseCategories';
import { filterByVehiclesAndPeriod, getEffectivePeriodRange } from '@/lib/utils/filterUtils';
import { normalizeFuelType, vehicleEnergy } from '@/lib/utils/vehicleEnergy';
import { getCategoryName } from '@/types/expense';

import type { Expense } from '@/types/expense';
import type { PeriodSelection } from '@/types/period';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MonthKey = { sortKey: string; displayKey: string };

export interface MonthlyData {
  month: string;
  Carburant: number;
  Assurance: number;
  Entretien: number;
  Autre: number;
  total: number;
}

export interface VehicleMonthlyData {
  month: string;
  [vehicleId: string]: number | string;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface VehicleStat {
  vehicleId: number;
  vehicleName: string;
  vehicleColor: string;
  isElectric: boolean;
  count: number;
  cost: number;
  rank: number;
  percentage: number;
  vehicle?: {
    vehicle_id: number;
    name?: string;
    make?: string;
    model?: string;
    image: string | null;
    plate?: string;
    color?: string;
    fuel_type?: string;
  };
}

export interface OdometerEntry {
  date: string;
  odometer: number;
}

export interface OdometerSeries {
  vehicle_id: number;
  name: string;
  color: string | undefined;
  entries: OdometerEntry[];
}

export interface StatisticsData {
  totalCost: number;
  totalExpenses: number;
  fillsCount: number;
  energyCost: number;
  annualProjection: number;
  annualKmProjection: number;
  avgCostPerMonth: number;
  monthsWithData: number;
  previousPeriodCost: number;
  previousYearTotal: number;
  trendPercentage: number;
  totalKilometers: number;
  totalLiters: number;
  avgFillAmount: number;
  avgConsumption: number;
  electricShare: number;
  hasElectricVehicle: boolean;
  firstExpenseDate: string | null;
  lastExpenseDate: string | null;
  expensesByMonth: MonthlyData[];
  expenseByCategory: CategoryDataPoint[];
  vehicleStats: VehicleStat[];
  vehicleExpensesByMonth: VehicleMonthlyData[];
  odometerSeries: OdometerSeries[];
  /** Total CO2 emitted in kg (fuel + electric, using ADEME factors or official vehicle data) */
  totalCO2Kg: number;
  /** CO2 emitted per km driven, in g/km */
  co2PerKm: number;
  /** Total cost divided by total km driven, in €/km */
  costPerKm: number;
  /** Which data source was used for CO2 calculation */
  co2Method: 'official' | 'ademe' | 'mixed';
  /** Vehicle names for which the official homologated CO2 value was used */
  officialCO2VehicleNames: string[];
}

// ---------------------------------------------------------------------------
// Public: filtering
// ---------------------------------------------------------------------------

/** Filter expenses by selected vehicles and time period. */
export function filterExpenses(
  expenses: Expense[],
  selectedVehicleIds: number[],
  selectedPeriod: PeriodSelection,
): Expense[] {
  return filterByVehiclesAndPeriod(expenses, selectedVehicleIds, selectedPeriod);
}

// ---------------------------------------------------------------------------
// Public: month key generation
// ---------------------------------------------------------------------------

/** Returns display + sort keys for each month in the selected period. */
export function buildMonthKeys(
  selectedPeriod: PeriodSelection,
  now: Date,
  monthsNum: number,
): MonthKey[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { year: '2-digit', month: 'short' });

  if (selectedPeriod === 'year') {
    return Array.from({ length: currentMonth + 1 }, (_, i) => {
      const d = new Date(currentYear, i, 1);
      return { sortKey: `${d.getFullYear()}-${String(i).padStart(2, '0')}`, displayKey: fmt(d) };
    });
  }

  // Custom date range: iterate month by month from start to end
  if (typeof selectedPeriod === 'object' && selectedPeriod.preset === 'custom') {
    const start = new Date(selectedPeriod.start);
    const end = new Date(selectedPeriod.end);
    const keys: MonthKey[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= endMonth) {
      keys.push({
        sortKey: `${current.getFullYear()}-${String(current.getMonth()).padStart(2, '0')}`,
        displayKey: fmt(current),
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return keys;
  }

  const count = selectedPeriod === 'month' ? 1 : monthsNum;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      sortKey: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`,
      displayKey: fmt(d),
    };
  });
}

// ---------------------------------------------------------------------------
// Public: main orchestrator
// ---------------------------------------------------------------------------

/**
 * Compute all statistics from filtered and unfiltered expense sets.
 *
 * @param filteredExpenses - Expenses already filtered by vehicle selection and period
 * @param allExpenses      - All expenses (unfiltered by period) for trend/projection logic
 * @param vehicles         - Full vehicle list for enrichment
 * @param selectedVehicleIds - Active vehicle filter
 * @param selectedPeriod   - Active period filter
 */
export function computeStatistics(
  filteredExpenses: Expense[],
  allExpenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
  selectedVehicleIds: number[],
  selectedPeriod: PeriodSelection,
): StatisticsData {
  const now = new Date();
  const monthsNum = computeMonthsNum(selectedPeriod, now, allExpenses, selectedVehicleIds);
  const monthKeys = buildMonthKeys(selectedPeriod, now, monthsNum);

  const odometerSeries = computeOdometerSeries(selectedVehicleIds, vehicles, filteredExpenses);

  if (!filteredExpenses.length) {
    return emptyStats(monthsNum, odometerSeries);
  }

  const costs = computeCostsByCategory(filteredExpenses);
  const { fuelCost, electricChargeCost, insuranceCost, maintenanceCost, otherCost } = costs;
  const energyCost = fuelCost + electricChargeCost;
  const totalCost = energyCost + insuranceCost + maintenanceCost + otherCost;

  const vehicleStats = computeVehicleStats(filteredExpenses, vehicles, totalCost);
  const {
    annualProjection,
    annualKmProjection,
    previousPeriodCost,
    previousYearTotal,
    trendPercentage,
  } = computeProjectionsAndTrends(
    allExpenses,
    selectedVehicleIds,
    selectedPeriod,
    totalCost,
    monthsNum,
  );
  const { totalKilometers, totalLiters, avgConsumption, electricShare, hasElectricVehicle } =
    computeDistanceEnergy(filteredExpenses, vehicles, selectedVehicleIds);

  const energyExpenses = filteredExpenses.filter(
    (e) => e.type === 'fuel' || e.type === 'electric_charge',
  );
  const fillsCount = energyExpenses.length;
  const avgFillAmount = fillsCount > 0 ? energyCost / fillsCount : 0;

  const { totalCO2Kg, co2PerKm, costPerKm, co2Method, officialCO2VehicleNames } =
    computeCarbonAndCost(filteredExpenses, vehicles, totalKilometers, totalCost);

  const sorted = [...filteredExpenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return {
    totalCost,
    totalExpenses: filteredExpenses.length,
    fillsCount,
    energyCost,
    annualProjection,
    annualKmProjection,
    avgCostPerMonth: totalCost / monthsNum,
    monthsWithData: monthsNum,
    previousPeriodCost,
    previousYearTotal,
    trendPercentage,
    totalKilometers,
    totalLiters,
    avgFillAmount,
    avgConsumption,
    electricShare,
    hasElectricVehicle,
    firstExpenseDate: sorted[0]?.date ?? null,
    lastExpenseDate: sorted[sorted.length - 1]?.date ?? null,
    expensesByMonth: computeMonthlyData(filteredExpenses, monthKeys),
    expenseByCategory: computeExpenseByCategory(costs, energyCost),
    vehicleStats,
    vehicleExpensesByMonth: computeVehicleMonthlyData(
      filteredExpenses,
      monthKeys,
      selectedVehicleIds,
    ),
    odometerSeries,
    totalCO2Kg,
    co2PerKm,
    costPerKm,
    co2Method,
    officialCO2VehicleNames,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function emptyStats(monthsNum: number, odometerSeries: OdometerSeries[]): StatisticsData {
  return {
    totalCost: 0,
    totalExpenses: 0,
    fillsCount: 0,
    energyCost: 0,
    annualProjection: 0,
    annualKmProjection: 0,
    avgCostPerMonth: 0,
    monthsWithData: monthsNum,
    previousPeriodCost: 0,
    previousYearTotal: 0,
    trendPercentage: 0,
    totalKilometers: 0,
    totalLiters: 0,
    avgFillAmount: 0,
    avgConsumption: 0,
    electricShare: 0,
    hasElectricVehicle: false,
    firstExpenseDate: null,
    lastExpenseDate: null,
    expensesByMonth: [],
    expenseByCategory: [],
    vehicleStats: [],
    vehicleExpensesByMonth: [],
    odometerSeries,
    totalCO2Kg: 0,
    co2PerKm: 0,
    costPerKm: 0,
    co2Method: 'ademe',
    officialCO2VehicleNames: [],
  };
}

function computeMonthsNum(
  selectedPeriod: PeriodSelection,
  now: Date,
  allExpenses: Expense[],
  selectedVehicleIds: number[],
): number {
  if (selectedPeriod === 'year') return now.getMonth() + 1;
  if (selectedPeriod === 'month') return 1;
  if (selectedPeriod === '3months') return 3;
  if (selectedPeriod === '6months') return 6;
  if (selectedPeriod === '12months') return 12;

  if (selectedPeriod === 'all') {
    const relevant = allExpenses.filter((e) => selectedVehicleIds.includes(e.vehicle_id));
    if (!relevant.length) return 12;
    const times = relevant.map((e) => new Date(e.date).getTime());
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    return (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1;
  }

  // Custom date range
  if (typeof selectedPeriod === 'object' && selectedPeriod.preset === 'custom') {
    const start = new Date(selectedPeriod.start);
    const end = new Date(selectedPeriod.end);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
  }

  return 12;
}

interface CostsByCategory {
  fuelCost: number;
  electricChargeCost: number;
  insuranceCost: number;
  maintenanceCost: number;
  otherCost: number;
}

function computeCostsByCategory(expenses: Expense[]): CostsByCategory {
  const costs = {
    fuelCost: 0,
    electricChargeCost: 0,
    insuranceCost: 0,
    maintenanceCost: 0,
    otherCost: 0,
  };
  for (const { type, amount = 0 } of expenses) {
    if (type === 'fuel') costs.fuelCost += amount;
    else if (type === 'electric_charge') costs.electricChargeCost += amount;
    else if (type === 'insurance') costs.insuranceCost += amount;
    else if (type === 'maintenance') costs.maintenanceCost += amount;
    else costs.otherCost += amount;
  }
  return costs;
}

function computeMonthlyData(expenses: Expense[], monthKeys: MonthKey[]): MonthlyData[] {
  const map = new Map<string, MonthlyData>(
    monthKeys.map(({ sortKey, displayKey }) => [
      sortKey,
      { month: displayKey, Carburant: 0, Assurance: 0, Entretien: 0, Autre: 0, total: 0 },
    ]),
  );
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const row = map.get(key);
    if (!row) continue;
    const cat = getCategoryName(e.type);
    const amount = e.amount ?? 0;
    if (cat === 'Carburant') row.Carburant += amount;
    else if (cat === 'Assurance') row.Assurance += amount;
    else if (cat === 'Entretien') row.Entretien += amount;
    else row.Autre += amount;
    row.total += amount;
  }
  return Array.from(map.values());
}

function computeVehicleMonthlyData(
  expenses: Expense[],
  monthKeys: MonthKey[],
  vehicleIds: number[],
): VehicleMonthlyData[] {
  const map = new Map<string, VehicleMonthlyData>(
    monthKeys.map(({ sortKey, displayKey }) => {
      const entry: VehicleMonthlyData = { month: displayKey };
      vehicleIds.forEach((id) => (entry[String(id)] = 0));
      return [sortKey, entry];
    }),
  );
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const row = map.get(key);
    if (row)
      row[String(e.vehicle_id)] = ((row[String(e.vehicle_id)] as number) || 0) + (e.amount ?? 0);
  }
  return Array.from(map.values());
}

function computeVehicleStats(
  expenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
  totalCost: number,
): VehicleStat[] {
  const map = new Map<
    number,
    {
      name: string;
      color: string;
      isElectric: boolean;
      count: number;
      cost: number;
      vehicle: Vehicle | VehicleMinimal | undefined;
    }
  >();

  for (const e of expenses) {
    const v = vehicles.find((vv) => vv.vehicle_id === e.vehicle_id);
    const existing = map.get(e.vehicle_id);
    if (existing) {
      existing.count++;
      existing.cost += e.amount ?? 0;
    } else {
      map.set(e.vehicle_id, {
        name: v?.name ?? e.vehicle_name ?? `Véhicule ${e.vehicle_id}`,
        color: v?.color || 'gray',
        isElectric: vehicleEnergy(v?.fuel_type).electric,
        count: 1,
        cost: e.amount ?? 0,
        vehicle: v,
      });
    }
  }

  return Array.from(map.entries())
    .map(([vehicleId, d]) => ({
      vehicleId,
      vehicleName: d.name,
      vehicleColor: d.color,
      isElectric: d.isElectric,
      count: d.count,
      cost: d.cost,
      rank: 0,
      percentage: totalCost > 0 ? (d.cost / totalCost) * 100 : 0,
      vehicle: d.vehicle
        ? {
            vehicle_id: d.vehicle.vehicle_id,
            name: d.vehicle.name ?? undefined,
            make: d.vehicle.make ?? undefined,
            model: d.vehicle.model ?? undefined,
            image: 'image' in d.vehicle ? (d.vehicle.image ?? null) : null,
            plate: 'plate' in d.vehicle ? (d.vehicle.plate ?? undefined) : undefined,
            color: d.vehicle.color ?? undefined,
            fuel_type: d.vehicle.fuel_type ?? undefined,
          }
        : undefined,
    }))
    .sort((a, b) => b.cost - a.cost)
    .map((v, i) => ({ ...v, rank: i + 1 }));
}

function computeProjectionsAndTrends(
  allExpenses: Expense[],
  selectedVehicleIds: number[],
  selectedPeriod: PeriodSelection,
  totalCost: number,
  monthsNum: number,
): {
  annualProjection: number;
  annualKmProjection: number;
  previousPeriodCost: number;
  previousYearTotal: number;
  trendPercentage: number;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Annual projection
  let annualProjection: number;
  if (selectedPeriod === 'year') {
    // YTD extrapolation: more accurate for current year view
    const currentYearCost = allExpenses
      .filter(
        (e) =>
          new Date(e.date).getFullYear() === currentYear &&
          selectedVehicleIds.includes(e.vehicle_id),
      )
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    annualProjection = monthsNum > 0 ? (currentYearCost / monthsNum) * 12 : 0;
  } else {
    annualProjection = monthsNum > 0 ? (totalCost / monthsNum) * 12 : 0;
  }

  // Previous year total (always computed for reference)
  const previousYearTotal = allExpenses
    .filter(
      (e) =>
        new Date(e.date).getFullYear() === currentYear - 1 &&
        selectedVehicleIds.includes(e.vehicle_id),
    )
    .reduce((s, e) => s + (e.amount ?? 0), 0);

  // Previous comparable period cost
  let previousPeriodCost = 0;
  if (selectedPeriod === 'month') {
    const pm = currentMonth === 0 ? 11 : currentMonth - 1;
    const py = currentMonth === 0 ? currentYear - 1 : currentYear;
    previousPeriodCost = allExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return (
          d.getMonth() === pm && d.getFullYear() === py && selectedVehicleIds.includes(e.vehicle_id)
        );
      })
      .reduce((s, e) => s + (e.amount ?? 0), 0);
  } else if (selectedPeriod === 'year') {
    previousPeriodCost = previousYearTotal;
  } else if (
    selectedPeriod === '3months' ||
    selectedPeriod === '6months' ||
    selectedPeriod === '12months'
  ) {
    // Mirror the rolling window backwards by the same duration
    const { start } = getEffectivePeriodRange(selectedPeriod);
    if (start) {
      const duration = now.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(now.getTime() - duration * 2);
      previousPeriodCost = allExpenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= prevStart && d <= prevEnd && selectedVehicleIds.includes(e.vehicle_id);
        })
        .reduce((s, e) => s + (e.amount ?? 0), 0);
    }
  } else if (typeof selectedPeriod === 'object' && selectedPeriod.preset === 'custom') {
    // Mirror the custom range backwards by the same duration
    const start = new Date(selectedPeriod.start);
    const end = new Date(selectedPeriod.end);
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(start.getTime() - duration - 1);
    previousPeriodCost = allExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= prevStart && d <= prevEnd && selectedVehicleIds.includes(e.vehicle_id);
      })
      .reduce((s, e) => s + (e.amount ?? 0), 0);
  }

  const trendPercentage =
    previousPeriodCost > 0 ? ((totalCost - previousPeriodCost) / previousPeriodCost) * 100 : 0;

  // Km projection: fills with odometer data in current year
  const currentYearFills = allExpenses.filter(
    (e) =>
      (e.type === 'fuel' || e.type === 'electric_charge') &&
      e.odometer != null &&
      new Date(e.date).getFullYear() === currentYear &&
      selectedVehicleIds.includes(e.vehicle_id),
  );

  const vehicleOdometers = new Map<number, { min: number; max: number }>();
  for (const e of currentYearFills) {
    const odo = e.odometer as number;
    const cur = vehicleOdometers.get(e.vehicle_id);
    vehicleOdometers.set(e.vehicle_id, {
      min: cur ? Math.min(cur.min, odo) : odo,
      max: cur ? Math.max(cur.max, odo) : odo,
    });
  }
  const totalKmYTD = Array.from(vehicleOdometers.values()).reduce((s, d) => s + (d.max - d.min), 0);
  const annualKmProjection = totalKmYTD > 0 ? (totalKmYTD / (currentMonth + 1)) * 12 : 0;

  return {
    annualProjection,
    annualKmProjection,
    previousPeriodCost,
    previousYearTotal,
    trendPercentage,
  };
}

function computeDistanceEnergy(
  expenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
  selectedVehicleIds: number[],
): {
  totalKilometers: number;
  totalLiters: number;
  avgConsumption: number;
  electricShare: number;
  hasElectricVehicle: boolean;
} {
  const vehicleDistances = new Map<number, { min: number; max: number }>();
  for (const e of expenses) {
    const odo = e.odometer;
    if (odo) {
      const ex = vehicleDistances.get(e.vehicle_id);
      if (ex) {
        ex.min = Math.min(ex.min, odo);
        ex.max = Math.max(ex.max, odo);
      } else {
        vehicleDistances.set(e.vehicle_id, { min: odo, max: odo });
      }
    }
  }
  const totalKilometers = Array.from(vehicleDistances.values()).reduce(
    (s, d) => s + d.max - d.min,
    0,
  );

  const totalLiters = expenses
    .filter((e) => e.type === 'fuel')
    .reduce((s, e) => s + (e.liters ?? 0), 0);

  let fuelCost = 0;
  let electricChargeCost = 0;
  for (const e of expenses) {
    if (e.type === 'fuel') fuelCost += e.amount ?? 0;
    else if (e.type === 'electric_charge') electricChargeCost += e.amount ?? 0;
  }
  const energyCost = fuelCost + electricChargeCost;

  const hasElectricVehicle = vehicles
    .filter((v) => selectedVehicleIds.includes(v.vehicle_id))
    .some((v) => vehicleEnergy(v.fuel_type).electric);

  return {
    totalKilometers,
    totalLiters,
    avgConsumption:
      totalKilometers > 0 && totalLiters > 0 ? (totalLiters / totalKilometers) * 100 : 0,
    electricShare: energyCost > 0 ? (electricChargeCost / energyCost) * 100 : 0,
    hasElectricVehicle,
  };
}

function computeExpenseByCategory(costs: CostsByCategory, energyCost: number): CategoryDataPoint[] {
  return EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.name,
    color: cat.color,
    value:
      cat.name === 'Carburant'
        ? energyCost
        : cat.name === 'Assurance'
          ? costs.insuranceCost
          : cat.name === 'Entretien'
            ? costs.maintenanceCost
            : costs.otherCost,
  }));
}

// ---------------------------------------------------------------------------
// CO2 & cost-per-km
// ---------------------------------------------------------------------------

/** ADEME 2023 emission factors (kg CO2 per unit) */
const CO2_GASOLINE = 2.28; // kg/L (essence)
const CO2_DIESEL = 2.67; // kg/L (diesel)
const CO2_ELECTRIC = 0.052; // kg/kWh (French grid, ADEME 2023)

function computeCarbonAndCost(
  expenses: Expense[],
  vehicles: (Vehicle | VehicleMinimal)[],
  totalKilometers: number,
  totalCost: number,
): {
  totalCO2Kg: number;
  co2PerKm: number;
  costPerKm: number;
  co2Method: 'official' | 'ademe' | 'mixed';
  officialCO2VehicleNames: string[];
} {
  // Build per-vehicle km range from odometer readings
  const vehicleOdo = new Map<number, { min: number; max: number }>();
  for (const e of expenses) {
    if (!e.odometer) continue;
    const ex = vehicleOdo.get(e.vehicle_id);
    if (ex) {
      ex.min = Math.min(ex.min, e.odometer);
      ex.max = Math.max(ex.max, e.odometer);
    } else {
      vehicleOdo.set(e.vehicle_id, { min: e.odometer, max: e.odometer });
    }
  }
  const vehicleKm = new Map<number, number>();
  vehicleOdo.forEach((v, id) => vehicleKm.set(id, v.max - v.min));

  let totalCO2 = 0;
  let officialCount = 0;
  let ademeCount = 0;
  const officialCO2VehicleNames: string[] = [];

  // Unique vehicle IDs in these expenses
  const vehicleIds = [...new Set(expenses.map((e) => e.vehicle_id))];

  for (const vehicleId of vehicleIds) {
    const vehicle = vehicles.find((v) => v.vehicle_id === vehicleId);
    const officialGKm = vehicle && 'co2_emission' in vehicle ? vehicle.co2_emission : null;
    const km = vehicleKm.get(vehicleId) ?? 0;

    if (officialGKm != null && officialGKm > 0 && km > 0) {
      // Use official homologated value: g/km × km / 1000 = kg
      totalCO2 += (officialGKm * km) / 1000;
      officialCount++;
      officialCO2VehicleNames.push(vehicle?.name ?? vehicle?.make ?? `Véhicule ${vehicleId}`);
    } else {
      // ADEME factors from actual consumption data
      for (const e of expenses.filter((ex) => ex.vehicle_id === vehicleId)) {
        const isDiesel = normalizeFuelType(vehicle?.fuel_type) === 'diesel';
        if (e.type === 'fuel' && e.liters != null) {
          totalCO2 += e.liters * (isDiesel ? CO2_DIESEL : CO2_GASOLINE);
        } else if (e.type === 'electric_charge' && e.kwh != null) {
          totalCO2 += e.kwh * CO2_ELECTRIC;
        }
      }
      ademeCount++;
    }
  }

  const co2Method: 'official' | 'ademe' | 'mixed' =
    officialCount === 0 ? 'ademe' : ademeCount === 0 ? 'official' : 'mixed';

  const totalCO2Kg = Math.round(totalCO2);
  const co2PerKm =
    totalKilometers > 0 ? Math.round((totalCO2 / totalKilometers) * 1000 * 10) / 10 : 0;
  const costPerKm =
    totalKilometers > 0 ? Math.round((totalCost / totalKilometers) * 1000) / 1000 : 0;

  return { totalCO2Kg, co2PerKm, costPerKm, co2Method, officialCO2VehicleNames };
}

function computeOdometerSeries(
  vehicleIds: number[],
  vehicles: (Vehicle | VehicleMinimal)[],
  filteredExpenses: Expense[],
): OdometerSeries[] {
  return vehicleIds.map((vehicleId) => {
    const vehicle = vehicles.find((v) => v.vehicle_id === vehicleId);
    return {
      vehicle_id: vehicleId,
      name: vehicle?.name ?? `Véhicule ${vehicleId}`,
      color: vehicle?.color ?? undefined,
      entries: filteredExpenses
        .filter((e) => e.vehicle_id === vehicleId && (e.odometer ?? 0) > 0)
        .map((e) => ({ date: e.date, odometer: e.odometer! })),
    };
  });
}
