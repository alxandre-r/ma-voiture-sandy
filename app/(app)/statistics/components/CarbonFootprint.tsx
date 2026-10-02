'use client';

import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import InfoTooltip from '@/components/common/ui/InfoTooltip';

interface CarbonFootprintProps {
  totalCO2Kg: number;
  co2PerKm: number; // g/km
  totalKilometers: number;
  totalLiters?: number;
  co2Method?: 'official' | 'ademe' | 'mixed';
  officialCO2VehicleNames?: string[];
  annualKmProjection?: number;
}

/** Annual CO2 reference for a French driver: ~1 600 kg/year (ADEME) */
const FR_ANNUAL_KG = 1600;
/** One tree absorbs ~22 kg CO2/year (ADEME estimate) */
const KG_PER_TREE_YEAR = 22;
/** 12 000 km/year: French average annual distance */
const FR_ANNUAL_KM = 12000;

function buildMethodDetails(
  co2Method: 'official' | 'ademe' | 'mixed',
  officialNames: string[],
  totalKilometers: number,
  co2PerKm: number,
  totalLiters: number,
): string[] {
  if (co2Method === 'official') {
    return [
      `Données constructeur homologuées (cycle WLTP/NEDC)`,
      `Formule : ${totalKilometers.toLocaleString('fr-FR')} km × ${co2PerKm} g/km ÷ 1 000`,
      `Véhicule(s) : ${officialNames.join(', ')}`,
    ];
  }
  if (co2Method === 'mixed') {
    return [
      `${officialNames.join(', ')} : données constructeur (g/km × km)`,
      `Autres véhicules : facteurs ADEME 2023`,
      `Essence : 2,28 kg CO₂/L · Diesel : 2,67 kg CO₂/L`,
      `Électrique : 0,052 kg CO₂/kWh (réseau français)`,
    ];
  }
  // ademe
  return [
    `Calculé depuis les volumes consommés × facteurs ADEME 2023`,
    totalLiters > 0
      ? `Formule : ${Math.round(totalLiters)} L × facteur selon carburant`
      : `Formule : kWh consommés × 0,052 kg CO₂/kWh`,
    `Essence : 2,28 kg CO₂/L · Diesel : 2,67 kg CO₂/L`,
    `Électrique : 0,052 kg CO₂/kWh (réseau français)`,
    `Source : ADEME (Agence de la transition écologique)`,
  ];
}

export default function CarbonFootprint({
  totalCO2Kg,
  co2PerKm,
  totalKilometers,
  totalLiters = 0,
  co2Method = 'ademe',
  officialCO2VehicleNames = [],
  annualKmProjection = 0,
}: CarbonFootprintProps) {
  if (totalCO2Kg === 0 || totalKilometers === 0) return null;

  const projectedKm = annualKmProjection > 0 ? annualKmProjection : FR_ANNUAL_KM;

  const treeEquivalent = Math.round(totalCO2Kg / KG_PER_TREE_YEAR);
  const annualProjection =
    totalKilometers > 0 ? Math.round((totalCO2Kg / totalKilometers) * projectedKm) : 0;
  const annualDiffPct = Math.round(((annualProjection - FR_ANNUAL_KG) / FR_ANNUAL_KG) * 100);
  const isBetterThanAvg = annualProjection < FR_ANNUAL_KG;

  const methodTitle =
    co2Method === 'official'
      ? 'Données constructeur'
      : co2Method === 'mixed'
        ? 'Données mixtes'
        : 'Méthodologie ADEME 2023';

  const methodDetails = buildMethodDetails(
    co2Method,
    officialCO2VehicleNames,
    totalKilometers,
    co2PerKm,
    totalLiters,
  );

  // Bar comparison: annualized projection vs FR annual reference
  const barMax = Math.max(annualProjection, FR_ANNUAL_KG) * 1.15;
  const userBarPct = barMax > 0 ? (annualProjection / barMax) * 100 : 0;
  const refBarPct = barMax > 0 ? (FR_ANNUAL_KG / barMax) * 100 : 0;

  // Date
  const currentYear = new Date().getFullYear();

  return (
    <Card data-tour="stats-carbon">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg shrink-0 flex items-center justify-center">
            <Image src="/icons/leaf-green.svg" alt="CO₂" width={24} height={24} />
          </div>
          <CardTitle className="flex items-center gap-1.5">
            Empreinte carbone
            <InfoTooltip title={methodTitle} details={methodDetails} position="below" />
          </CardTitle>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
            isBetterThanAvg
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {isBetterThanAvg ? `−${Math.abs(annualDiffPct)}%` : `+${Math.abs(annualDiffPct)}%`} vs
          moy.
        </span>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 gap-5">
          {/* ── Left: hero number ── */}
          <div className="flex flex-col justify-center">
            {/* Big number */}
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-black text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                {totalCO2Kg.toLocaleString('fr-FR')}
              </span>
              <span className="text-xl font-semibold text-gray-400 dark:text-gray-500 mb-1">
                kg CO₂
              </span>
            </div>

            {/* Context */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              pour{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {totalKilometers.toLocaleString('fr-FR')} km
              </span>{' '}
              parcourus
              {totalLiters > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {Math.round(totalLiters)} L
                  </span>{' '}
                  consommés
                </>
              )}
            </p>

            {/* Tree equivalent */}
            {treeEquivalent > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Icon name="leaf" size={14} />
                <span>
                  Équivalent à{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {treeEquivalent} arbre{treeEquivalent > 1 ? 's' : ''}
                  </span>{' '}
                  à planter pour compenser
                </span>
                <InfoTooltip
                  title="Équivalent arbres"
                  details={[
                    `Un arbre absorbe ~${KG_PER_TREE_YEAR} kg CO₂/an (ADEME)`,
                    `Formule : ${totalCO2Kg} kg ÷ ${KG_PER_TREE_YEAR} kg/arbre`,
                    `= ${treeEquivalent} arbre${treeEquivalent > 1 ? 's' : ''}`,
                  ]}
                  position="above"
                />
              </div>
            )}
          </div>

          {/* ── Right: comparison + rate ── */}
          <div className="space-y-4">
            {/* Annual projection comparison bar */}
            {annualProjection > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span className="font-medium">Projection {currentYear}</span>
                  <InfoTooltip
                    title="Projection annuelle"
                    details={[
                      `Basé sur ${FR_ANNUAL_KM.toLocaleString('fr-FR')} km/an (distance moy. française)`,
                      `Formule : ${co2PerKm.toFixed(1)} g/km × ${FR_ANNUAL_KM.toLocaleString('fr-FR')} km ÷ 1 000`,
                      `= ${annualProjection.toLocaleString('fr-FR')} kg CO₂/an`,
                      `Référence : ${FR_ANNUAL_KG.toLocaleString('fr-FR')} kg/an (ADEME)`,
                    ]}
                    position="below"
                  />
                </div>

                {/* User bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Votre projection
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums ${isBetterThanAvg ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                    >
                      {annualProjection.toLocaleString('fr-FR')} kg/an
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-900/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBetterThanAvg ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ width: `${userBarPct}%` }}
                    />
                  </div>
                </div>

                {/* Reference bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Moyenne France</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {FR_ANNUAL_KG.toLocaleString('fr-FR')} kg/an
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-900/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-300 dark:bg-gray-600"
                      style={{ width: `${refBarPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Rate badge */}
            <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Taux d&apos;émission renseigné :
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md font-mono">
                  {co2PerKm.toFixed(1)} g/km
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
