'use client';

import { motion } from 'framer-motion';
import { useRef, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { EXPENSE_CATEGORIES } from '@/app/(app)/expenses/components/expenseCategories';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { VEHICLE_LINE_COLORS, CHART_AXIS, CHART_FALLBACK_COLOR } from '@/lib/utils/chartColors';
import { downloadChartSVG } from '@/lib/utils/exportChart';
import { formatCurrency } from '@/lib/utils/format';

type ChartMode = 'category' | 'vehicle';

interface MonthlyExpenseChartProps {
  data: Array<{
    month: string;
    Carburant: number;
    Assurance: number;
    Entretien: number;
    Autre: number;
    total: number;
  }>;
  vehicleData?: Array<{
    month: string;
    [vehicleId: string]: number | string;
  }>;
  vehicles?: Array<{
    vehicle_id: number;
    name: string;
    color: string;
  }>;
  previousYearData?: Array<{
    month: string;
    total: number;
  }>;
}

const VEHICLE_COLORS = VEHICLE_LINE_COLORS;

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyExpenseChart({
  data,
  vehicleData,
  vehicles,
  previousYearData,
}: MonthlyExpenseChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('category');
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a map for previous year data
  const prevDataMap = useMemo(
    () => new Map(previousYearData?.map((d) => [d.month, d.total]) || []),
    [previousYearData],
  );

  // Add previous year data to the chart data
  const chartData = useMemo(() => {
    if (chartMode === 'category') {
      return data.map((item) => ({
        ...item,
        previous: prevDataMap.get(item.month) || 0,
      }));
    } else {
      // For vehicle mode, we need to transform vehicleData
      return (
        vehicleData?.map((item) => {
          const previous = prevDataMap.get(item.month) || 0;
          // Convert vehicleId keys to vehicle names
          const vehicleValues: Record<string, number> = {};
          vehicles?.forEach((v) => {
            const value = item[v.vehicle_id as keyof typeof item];
            vehicleValues[v.name] = typeof value === 'number' ? value : 0;
          });
          return {
            month: item.month,
            ...vehicleValues,
            previous,
            total: Object.values(vehicleValues).reduce((a, b) => a + b, 0),
          };
        }) || []
      );
    }
  }, [data, vehicleData, vehicles, chartMode, prevDataMap]);

  const _hasPreviousData = previousYearData && previousYearData.length > 0;

  // Get colors from the expense categories
  const getCategoryColor = (category: string): string => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.name === category);
    return cat?.color || CHART_FALLBACK_COLOR;
  };

  // Get vehicle color
  const getVehicleColor = (vehicleId: number): string => {
    const vehicle = vehicles?.find((v) => v.vehicle_id === vehicleId);
    if (vehicle?.color) return vehicle.color;
    return VEHICLE_COLORS[vehicleId % VEHICLE_COLORS.length];
  };

  const isVehicleMode = chartMode === 'vehicle';

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Dépenses mensuelles</CardTitle>
          <button
            onClick={() => downloadChartSVG(containerRef, 'depenses-mensuelles')}
            className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
            title="Exporter en SVG"
          >
            <Icon name="arrow-down" size={14} />
          </button>
        </div>
        {/* Toggle Switch */}
        <div
          className="relative w-36 sm:w-40 h-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full 
        border border-gray-100 hover:shadow-sm transition-all 
        dark:border-gray-700 dark:hover:shadow-xl dark:from-gray-800 dark:to-gray-900 shrink-0 overflow-hidden p-1"
        >
          {/* Sliding background */}
          <motion.div
            className="absolute top-1 h-6 bg-gradient-to-r from-custom-1 to-violet-500 rounded-full shadow-md dark:shadow-xl"
            initial={false}
            animate={{
              x: isVehicleMode ? '100%' : '0%',
              width: isVehicleMode ? 'calc(50% - 4px)' : 'calc(50% - 4px)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
          {/* Labels container */}
          <div className="relative flex h-full w-full">
            <button
              type="button"
              onClick={() => setChartMode('category')}
              className={`flex-1 text-xs font-medium transition-colors duration-200 cursor-pointer ${
                !isVehicleMode ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Catégorie
            </button>
            <button
              type="button"
              onClick={() => setChartMode('vehicle')}
              className={`flex-1 text-xs font-medium transition-colors duration-200 cursor-pointer ${
                isVehicleMode ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Véhicule
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} stackOffset="sign" margin={{ left: -20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-gray-700"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: CHART_AXIS.tick }}
                axisLine={{ stroke: CHART_AXIS.axis }}
                tickLine={false}
                className="dark:axis-dark"
              />
              <YAxis
                tick={{ fontSize: 10, fill: CHART_AXIS.tick }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}€`}
                className="dark:axis-dark"
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Custom Legend with circles */}
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
                content={() => (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-1">
                    {isVehicleMode
                      ? vehicles?.map((vehicle) => (
                          <div
                            key={vehicle.vehicle_id}
                            className="flex items-center gap-1 sm:gap-2"
                          >
                            <span
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                              style={{ backgroundColor: getVehicleColor(vehicle.vehicle_id) }}
                            />
                            <span className="text-gray-600 dark:text-gray-300 text-xs">
                              {vehicle.name}
                            </span>
                          </div>
                        ))
                      : ['Assurance', 'Carburant', 'Entretien', 'Autre'].map((category) => (
                          <div key={category} className="flex items-center gap-1 sm:gap-2">
                            <span
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(category) }}
                            />
                            <span className="text-gray-600 dark:text-gray-300 text-xs">
                              {category}
                            </span>
                          </div>
                        ))}
                  </div>
                )}
              />
              {/* Stack order depends on mode */}
              {isVehicleMode ? (
                vehicles?.map((vehicle, index) => (
                  <Bar
                    key={vehicle.vehicle_id}
                    dataKey={vehicle.name}
                    name={vehicle.name}
                    stackId="a"
                    fill={getVehicleColor(vehicle.vehicle_id)}
                    radius={[
                      index === (vehicles?.length || 1) - 1 ? 4 : 0,
                      index === (vehicles?.length || 1) - 1 ? 4 : 0,
                      0,
                      0,
                    ]}
                  />
                ))
              ) : (
                <>
                  {/* Stack order: Assurance (bottom), Carburant, Entretien, Autre (top) */}
                  <Bar
                    dataKey="Assurance"
                    name="Assurance"
                    stackId="a"
                    fill={getCategoryColor('Assurance')}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Carburant"
                    name="Carburant"
                    stackId="a"
                    fill={getCategoryColor('Carburant')}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Entretien"
                    name="Entretien"
                    stackId="a"
                    fill={getCategoryColor('Entretien')}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Autre"
                    name="Autre"
                    stackId="a"
                    fill={getCategoryColor('Autre')}
                    radius={[4, 4, 0, 0]}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
