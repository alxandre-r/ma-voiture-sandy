'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/ui/card';

interface BottomStatsProps {
  totalLiters: number;
  avgFillAmount: number;
  avgChargeAmount?: number;
  avgPricePerLiter: number;
  totalKilometers: number;
  electricShare?: number;
  hasElectricVehicle?: boolean;
  avgConsumption?: number;
  avgElectricConsumption?: number;
  costPerKm?: number;
}

export default function BottomStats({
  totalLiters: _totalLiters,
  avgFillAmount,
  avgChargeAmount = 0,
  avgPricePerLiter: _avgPricePerLiter,
  totalKilometers,
  electricShare = 0,
  hasElectricVehicle = false,
  avgConsumption = 0,
  avgElectricConsumption = 0,
  costPerKm = 0,
}: BottomStatsProps) {
  // Build dynamic stats based on whether there's an electric vehicle
  const stats = [];

  // Always show distance first
  stats.push({
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    color: 'blue',
    title: 'Distance Parcourue',
    value: `${totalKilometers.toLocaleString('fr-FR')} km`,
  });

  // Fuel consumption: always for a fuel-only selection, otherwise only when known
  if (!hasElectricVehicle || avgConsumption > 0) {
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      color: 'teal',
      title: 'Consommation moyenne',
      value: avgConsumption > 0 ? `${avgConsumption.toFixed(1)} L/100km` : '—',
    });
  }

  if (avgElectricConsumption > 0) {
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'blue',
      title: 'Consommation électrique',
      value: `${avgElectricConsumption.toFixed(1)} kWh/100km`,
    });
  }

  // Show electric share if there's an electric vehicle
  if (hasElectricVehicle) {
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'emerald',
      title: "Part de l'électricité dans le coût de l'énergie",
      value: `${electricShare.toFixed(1)}%`,
    });
  }

  // Average fill amount (fuel fills only)
  if (avgFillAmount > 0 || avgChargeAmount === 0)
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'orange',
      title: "Coût moyen d'un plein",
      value: `${avgFillAmount.toFixed(2)} €`,
    });

  if (avgChargeAmount > 0) {
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'blue',
      title: "Coût moyen d'une recharge",
      value: `${avgChargeAmount.toFixed(2)} €`,
    });
  }

  // Cost per km
  if (costPerKm > 0) {
    stats.push({
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
      color: 'indigo',
      title: 'Coût au kilomètre',
      value: `${costPerKm.toFixed(3).replace('.', ',')} €/km`,
    });
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30';
      case 'orange':
        return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30';
      case 'purple':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30';
      case 'teal':
        return 'bg-teal-50 text-teal-600 dark:bg-teal-900/30';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30';
      case 'green':
        return 'bg-green-50 text-green-600 dark:bg-green-900/30';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-900/30';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4 dark:bg-gray-800/50 dark:border-gray-700"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  {stat.title}
                </p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
