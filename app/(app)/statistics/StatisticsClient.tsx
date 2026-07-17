/**
 * @file app/statistics/StatisticsClient.tsx
 * @description Orchestrates data fetching, filtering, and layout for the statistics page.
 * All computation is delegated to statisticsUtils; all fetching to useExpenses.
 */

'use client';

import { useMemo } from 'react';

import {
  StatisticsOverview,
  ExpenseCategoryChart,
  MonthlyExpenseChart,
  VehicleComparison,
  BottomStats,
} from '@/app/(app)/statistics/components';
import CarbonFootprint from '@/app/(app)/statistics/components/CarbonFootprint';
import OdometerEvolutionChart from '@/app/(app)/statistics/components/charts/OdometerEvolutionChart';
import VehicleComparisonTable from '@/app/(app)/statistics/components/VehicleComparisonTable';
import Icon from '@/components/common/ui/Icon';
import { useSelectors } from '@/contexts/SelectorsContext';
import { filterExpenses, computeStatistics } from '@/lib/utils/statisticsUtils';


import { useExpenses } from './hooks/useExpenses';
import Loading from './loading';

import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

interface StatisticsClientProps {
  vehicles: (Vehicle | VehicleMinimal)[];
}

export default function StatisticsClient({ vehicles }: StatisticsClientProps) {
  const { selectedVehicleIds, selectedPeriod } = useSelectors();
  const vehicleIds = useMemo(() => vehicles.map((v) => v.vehicle_id), [vehicles]);

  const { expenses, isLoading, isError } = useExpenses(vehicleIds);

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, selectedVehicleIds, selectedPeriod),
    [expenses, selectedVehicleIds, selectedPeriod],
  );

  const stats = useMemo(
    () =>
      computeStatistics(filteredExpenses, expenses, vehicles, selectedVehicleIds, selectedPeriod),
    [filteredExpenses, expenses, vehicles, selectedVehicleIds, selectedPeriod],
  );

  if (isLoading) return <Loading />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Impossible de charger les statistiques.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Vérifiez votre connexion et rechargez la page.
        </p>
      </div>
    );
  }

  if (filteredExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-16 h-16 bg-custom-1/10 rounded-full flex items-center justify-center">
          <Icon name="chart" size={32} className="text-custom-1 opacity-60" />
        </div>
        <p className="font-medium text-gray-700 dark:text-gray-300">
          Aucune donnée pour cette sélection
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
          Ajoutez des dépenses ou modifiez la période et le véhicule sélectionnés.
        </p>
      </div>
    );
  }

  const vehiclesForChart = selectedVehicleIds.map((id) => {
    const v = vehicles.find((v) => v.vehicle_id === id);
    return { vehicle_id: id, name: v?.name || `Véhicule ${id}`, color: v?.color || 'gray' };
  });

  return (
    <div className="space-y-4 px-2 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatisticsOverview
        totalCost={stats.totalCost}
        fillsCount={stats.totalExpenses}
        annualProjection={stats.annualProjection}
        annualKmProjection={stats.annualKmProjection}
        monthsWithData={stats.monthsWithData}
        previousPeriodCost={stats.previousPeriodCost}
        previousYearTotal={stats.previousYearTotal}
        selectedPeriod={selectedPeriod}
        totalKilometers={stats.totalKilometers}
        costPerKm={stats.costPerKm}
      />

      <MonthlyExpenseChart
        data={stats.expensesByMonth}
        vehicleData={stats.vehicleExpensesByMonth}
        vehicles={vehiclesForChart}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {stats.vehicleStats.length > 1 && (
          <VehicleComparison vehicleStats={stats.vehicleStats} totalCost={stats.totalCost} />
        )}
        <ExpenseCategoryChart data={stats.expenseByCategory} totalCost={stats.totalCost} />
        <BottomStats
          totalLiters={stats.totalLiters}
          avgFillAmount={stats.avgFillAmount}
          avgPricePerLiter={0}
          totalKilometers={stats.totalKilometers}
          electricShare={stats.electricShare}
          hasElectricVehicle={stats.hasElectricVehicle}
          avgConsumption={stats.avgConsumption}
          costPerKm={stats.costPerKm}
        />
      </div>

      <CarbonFootprint
        totalCO2Kg={stats.totalCO2Kg}
        co2PerKm={stats.co2PerKm}
        totalKilometers={stats.totalKilometers}
        totalLiters={stats.totalLiters}
        co2Method={stats.co2Method}
        officialCO2VehicleNames={stats.officialCO2VehicleNames}
        annualKmProjection={stats.annualKmProjection}
      />

      <OdometerEvolutionChart series={stats.odometerSeries} />

      <VehicleComparisonTable
        expenses={filteredExpenses}
        vehicles={vehicles}
        vehicleIds={selectedVehicleIds}
      />
    </div>
  );
}
