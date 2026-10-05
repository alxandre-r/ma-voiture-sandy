'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import InfoTooltip from '@/components/common/ui/InfoTooltip';

import type { VehicleHealthScore } from '@/lib/utils/vehicleHealthUtils';

interface HealthScoreCardProps {
  health: VehicleHealthScore;
  /** Own vehicle id: deep-links the insurance factor to its card on /insurance */
  vehicleId?: number;
}

function gradeLabel(score: number): string {
  if (score >= 8) return 'Complet';
  if (score >= 6) return 'Bien suivi';
  if (score >= 4) return 'À compléter';
  if (score >= 2) return 'Incomplet';
  return 'Critique';
}

function StatusIcon({ status }: { status: 'good' | 'warning' | 'critical' }) {
  if (status === 'good') {
    return (
      <svg
        className="w-4 h-4 text-emerald-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === 'warning') {
    return (
      <svg
        className="w-4 h-4 text-yellow-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4 text-red-500 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const METHODOLOGY_DETAILS = [
  'Score de départ : 10 pts',
  '─────────────────────',
  'Contrôle technique expiré : −3 pts',
  'Contrôle technique < 30 jours : −1 pt',
  'Rappel en retard : −2 pts (max −4)',
  'Rappel imminent : −1 pt (max −2)',
  'Pas de plein depuis 6 mois : −1 pt',
  "Pas d'entretien depuis 18 mois : −1 pt",
  "Pas d'assurance active : −2 pts",
  '─────────────────────',
  'Les données manquantes ne sont pas prises en compte.',
];

export default function HealthScoreCard({ health, vehicleId }: HealthScoreCardProps) {
  const { score, bgClass, textClass, factors } = health;
  const label = gradeLabel(score);
  const hasFactors = factors.length > 0;

  return (
    <Card data-tour="vehicle-health">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg
              className="w-5 h-5 text-gray-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Score de suivi
            <InfoTooltip
              title="Comment est calculé ce score ?"
              details={METHODOLOGY_DETAILS}
              position="below"
            />
          </CardTitle>

          {/* Score badge */}
          <div className={`flex items-baseline gap-0.5 px-3 py-1 rounded-xl ${bgClass}`}>
            <span className={`text-2xl font-black tabular-nums leading-none ${textClass}`}>
              {score}
            </span>
            <span className={`text-sm font-semibold opacity-60 ${textClass}`}>/10</span>
            <span className={`ml-2 text-xs font-semibold ${textClass}`}>{label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasFactors && (
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">
            Complétez les informations du véhicule (contrôle technique, pleins…) pour obtenir un
            score détaillé.
          </p>
        )}

        {hasFactors && (
          <div className="space-y-1.5">
            {factors.map((factor, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon status={factor.status} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
                    {factor.label}
                  </span>
                  {factor.penalty > 0 && (
                    <span className="text-xs font-bold text-red-500 dark:text-red-400 tabular-nums shrink-0">
                      −{factor.penalty} pts
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">{factor.detail}</p>
                {factor.recommendation && factor.status !== 'good' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 italic pl-6 mt-0.5">
                    {factor.label === 'Assurance' && vehicleId ? (
                      <>
                        →{' '}
                        <Link
                          href={`/insurance?vehicleId=${vehicleId}`}
                          className="underline hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          Gérer les assurances
                        </Link>
                      </>
                    ) : (
                      <>→ {factor.recommendation}</>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
