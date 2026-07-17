'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { CHART_AXIS, CHART_FALLBACK_COLOR } from '@/lib/utils/chartColors';
import { downloadChartSVG } from '@/lib/utils/exportChart';
import { formatNumber } from '@/lib/utils/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OdometerEntry {
  date: string;
  odometer: number;
}

interface OdometerSeries {
  vehicle_id: number;
  name: string;
  color: string | undefined;
  entries: OdometerEntry[];
}

interface OdometerEvolutionChartProps {
  series: OdometerSeries[];
}

type ChartMode = 'absolute' | 'relative';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toTs = (dateStr: string) => new Date(dateStr).getTime();

const buildMonthTicks = (minTs: number, maxTs: number): number[] => {
  const ticks: number[] = [];
  const d = new Date(minTs);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() <= maxTs) {
    ticks.push(d.getTime());
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
};

const fmtMonthTick = (ts: number) =>
  new Date(ts).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

const fmtFullDate = (ts: number) =>
  new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = ({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: number;
  mode: ChartMode;
}) => {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{fmtFullDate(label)}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name} :{' '}
          <span className="font-medium">
            {mode === 'relative' ? '+' : ''}
            {formatNumber(entry.value)} km
          </span>
        </p>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OdometerEvolutionChart({ series }: OdometerEvolutionChartProps) {
  const [mode, setMode] = useState<ChartMode>('relative');
  const containerRef = useRef<HTMLDivElement>(null);

  const hasData = series.some((s) => s.entries?.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution du kilométrage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 flex items-center justify-center text-gray-500">
            <p>Aucune donnée de kilométrage disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Baseline per vehicle for relative mode (first odometer value)
  const baselines = new Map<string, number>();
  series.forEach((s) => {
    if (!s.entries?.length) return;
    const sorted = [...s.entries].sort((a, b) => toTs(a.date) - toTs(b.date));
    baselines.set(s.name, sorted[0].odometer);
  });

  // Merge all entries into { ts, [vehicleName]: odometer } — apply baseline offset in relative mode
  const tsMap = new Map<number, Record<string, number>>();
  series.forEach((s) => {
    const base = baselines.get(s.name) ?? 0;
    s.entries.forEach(({ date, odometer }) => {
      const ts = toTs(date);
      if (!tsMap.has(ts)) tsMap.set(ts, { ts });
      tsMap.get(ts)![s.name] = mode === 'relative' ? odometer - base : odometer;
    });
  });
  const chartData = Array.from(tsMap.values()).sort((a, b) => a.ts - b.ts);

  const allTs = chartData.map((d) => d.ts);
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);
  const padding = Math.max((maxTs - minTs) * 0.02, 86_400_000);
  const monthTicks = buildMonthTicks(minTs, maxTs);

  const isRelative = mode === 'relative';

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Évolution du kilométrage</CardTitle>
          <button
            onClick={() => downloadChartSVG(containerRef, 'evolution-kilometrage')}
            className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
            title="Exporter en SVG"
          >
            <Icon name="arrow-down" size={14} />
          </button>
        </div>

        {/* Toggle — same pattern as MonthlyExpenseChart */}
        <div className="relative w-36 sm:w-40 h-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full border border-gray-100 hover:shadow-sm transition-all dark:border-gray-700 dark:hover:shadow-xl dark:from-gray-800 dark:to-gray-900 shrink-0 overflow-hidden p-1">
          <motion.div
            className="absolute top-1 h-6 bg-gradient-to-r from-custom-1 to-violet-500 rounded-full shadow-md dark:shadow-xl"
            initial={false}
            animate={{ x: isRelative ? '100%' : '0%', width: 'calc(50% - 4px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
          <div className="relative flex h-full w-full">
            <button
              type="button"
              onClick={() => setMode('absolute')}
              className={`flex-1 text-xs font-medium transition-colors duration-200 ${
                !isRelative ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Absolu
            </button>
            <button
              type="button"
              onClick={() => setMode('relative')}
              className={`flex-1 text-xs font-medium transition-colors duration-200 ${
                isRelative ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Relatif
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-56" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-gray-700"
                stroke={CHART_AXIS.grid}
                vertical={false}
              />

              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={[minTs - padding, maxTs + padding]}
                ticks={monthTicks}
                tickFormatter={fmtMonthTick}
                tick={{ fontSize: 10, fill: CHART_AXIS.tick }}
                axisLine={{ stroke: CHART_AXIS.axis }}
                tickLine={false}
                className="dark:axis-dark"
              />

              <YAxis
                tick={{ fontSize: 10, fill: CHART_AXIS.tick }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  isRelative ? `+${(v / 1000).toFixed(0)}k` : `${(v / 1000).toFixed(0)}k`
                }
                width={40}
                className="dark:axis-dark"
              />

              <Tooltip content={<CustomTooltip mode={mode} />} />

              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
                content={() => (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-1">
                    {series.map((s) => (
                      <div key={s.vehicle_id} className="flex items-center gap-1 sm:gap-2">
                        <span
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                          style={{ backgroundColor: s.color || CHART_FALLBACK_COLOR }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 text-xs">{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              />

              {series.map((s) => (
                <Line
                  key={s.vehicle_id}
                  type="monotone"
                  dataKey={s.name}
                  name={s.name}
                  stroke={s.color || CHART_FALLBACK_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: s.color || CHART_FALLBACK_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
