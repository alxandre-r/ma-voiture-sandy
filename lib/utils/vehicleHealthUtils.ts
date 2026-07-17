/**
 * @file lib/utils/vehicleHealthUtils.ts
 * @description Computes a 0-10 tracking score for each vehicle based on
 * tech control expiry, active reminders, last fill date, and maintenance history.
 * All functions are pure and fully testable.
 */

import { getReminderStatus } from './reminderUtils';

import type { Expense } from '@/types/expense';
import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface HealthFactor {
  label: string;
  penalty: number;
  status: 'good' | 'warning' | 'critical';
  detail: string;
  recommendation?: string;
}

export interface VehicleHealthScore {
  score: number; // 0–10
  grade: HealthGrade;
  bgClass: string; // Tailwind bg color
  textClass: string; // Tailwind text color
  ringClass: string; // Tailwind ring/border color
  factors: HealthFactor[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function gradeFromScore(score: number): HealthGrade {
  if (score >= 8) return 'A';
  if (score >= 6) return 'B';
  if (score >= 4) return 'C';
  if (score >= 2) return 'D';
  return 'F';
}

function colorFromGrade(grade: HealthGrade): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (grade) {
    case 'A':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        ring: 'ring-emerald-400 dark:ring-emerald-600',
      };
    case 'B':
      return {
        bg: 'bg-lime-100 dark:bg-lime-900/30',
        text: 'text-lime-700 dark:text-lime-400',
        ring: 'ring-lime-400 dark:ring-lime-600',
      };
    case 'C':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        ring: 'ring-yellow-400 dark:ring-yellow-600',
      };
    case 'D':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        ring: 'ring-orange-400 dark:ring-orange-600',
      };
    case 'F':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        ring: 'ring-red-400 dark:ring-red-600',
      };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a vehicle tracking score from 0 to 10.
 *
 * Factors (all are penalties subtracted from 10):
 * - Tech control: expired −3, due soon (<30 d) −1
 * - Overdue reminders: −2 each, capped at −4
 * - Due-soon reminders: −1 each, capped at −2
 * - No recent fill (>6 months, active vehicle): −1
 * - No maintenance in >18 months: −1
 * - No active insurance contract: −2
 *
 * @param vehicle  The vehicle to score
 * @param options  Optional context data for richer scoring
 */
export function computeHealthScore(
  vehicle: Vehicle,
  options?: {
    reminders?: Reminder[];
    expenses?: Expense[];
    /** Pass false to apply the no-insurance penalty. undefined = data unavailable (no penalty). */
    hasActiveInsurance?: boolean;
  },
): VehicleHealthScore {
  const factors: HealthFactor[] = [];
  let penalty = 0;
  const now = new Date();

  // ── Tech control ──────────────────────────────────────────────────────────
  if (vehicle.tech_control_expiry) {
    const expiry = new Date(vehicle.tech_control_expiry);
    const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / 86_400_000);
    if (daysUntil < 0) {
      penalty += 3;
      factors.push({
        label: 'Contrôle technique',
        penalty: 3,
        status: 'critical',
        detail: `Expiré depuis ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}`,
        recommendation: 'Prenez rendez-vous pour le contrôle technique dès que possible',
      });
    } else if (daysUntil <= 30) {
      penalty += 1;
      factors.push({
        label: 'Contrôle technique',
        penalty: 1,
        status: 'warning',
        detail: `Expire dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
        recommendation: 'Planifiez votre contrôle technique avant expiration',
      });
    } else {
      factors.push({
        label: 'Contrôle technique',
        penalty: 0,
        status: 'good',
        detail: `Valide jusqu'au ${expiry.toLocaleDateString('fr-FR')}`,
      });
    }
  }

  // ── Reminders ─────────────────────────────────────────────────────────────
  if (options?.reminders) {
    const vehicleReminders = options.reminders.filter(
      (r) => !r.is_completed && r.vehicle_id === vehicle.vehicle_id,
    );
    let overdueCount = 0;
    let dueSoonCount = 0;
    for (const r of vehicleReminders) {
      const status = getReminderStatus(r, vehicle.odometer ?? null);
      if (status === 'overdue') overdueCount++;
      else if (status === 'due-soon') dueSoonCount++;
    }
    const overduePenalty = Math.min(overdueCount * 2, 4);
    const dueSoonPenalty = Math.min(dueSoonCount * 1, 2);
    penalty += overduePenalty + dueSoonPenalty;

    if (overdueCount > 0) {
      factors.push({
        label: 'Rappels en retard',
        penalty: overduePenalty,
        status: 'critical',
        detail: `${overdueCount} rappel${overdueCount > 1 ? 's' : ''} en retard`,
        recommendation: 'Consultez la page Rappels pour traiter les entretiens en retard',
      });
    }
    if (dueSoonCount > 0) {
      factors.push({
        label: 'Rappels imminents',
        penalty: dueSoonPenalty,
        status: 'warning',
        detail: `${dueSoonCount} rappel${dueSoonCount > 1 ? 's' : ''} bientôt dû`,
        recommendation: 'Planifiez les entretiens bientôt dus dans la page Rappels',
      });
    }
  }

  // ── Recent fill activity ──────────────────────────────────────────────────
  if (vehicle.last_fill_date && vehicle.status === 'active') {
    const daysSince = Math.floor(
      (now.getTime() - new Date(vehicle.last_fill_date).getTime()) / 86_400_000,
    );
    if (daysSince > 180) {
      penalty += 1;
      factors.push({
        label: 'Activité récente',
        penalty: 1,
        status: 'warning',
        detail: `Pas de plein depuis ${Math.floor(daysSince / 30)} mois`,
        recommendation: "Enregistrez un plein pour maintenir l'historique à jour",
      });
    } else {
      factors.push({
        label: 'Activité récente',
        penalty: 0,
        status: 'good',
        detail: `Dernier plein il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`,
      });
    }
  }

  // ── Recent maintenance ────────────────────────────────────────────────────
  if (options?.expenses) {
    const maintenance = options.expenses.filter(
      (e) => e.vehicle_id === vehicle.vehicle_id && e.type === 'maintenance',
    );
    if (maintenance.length > 0) {
      const last = maintenance.reduce((latest, e) =>
        new Date(e.date) > new Date(latest.date) ? e : latest,
      );
      const daysSince = Math.floor((now.getTime() - new Date(last.date).getTime()) / 86_400_000);
      if (daysSince > 548) {
        // > 18 months
        penalty += 1;
        factors.push({
          label: 'Entretien récent',
          penalty: 1,
          status: 'warning',
          detail: `Dernier entretien il y a ${Math.floor(daysSince / 30)} mois`,
          recommendation: 'Ajoutez un entretien dans la page Entretien',
        });
      } else {
        factors.push({
          label: 'Entretien récent',
          penalty: 0,
          status: 'good',
          detail: `Dernier entretien il y a ${Math.floor(daysSince / 30)} mois`,
        });
      }
    }
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  if (options?.hasActiveInsurance === false) {
    penalty += 2;
    factors.push({
      label: 'Assurance',
      penalty: 2,
      status: 'critical',
      detail: "Aucun contrat d'assurance actif",
      recommendation: 'Souscrivez à une assurance via la page Assurance',
    });
  } else if (options?.hasActiveInsurance === true) {
    factors.push({
      label: 'Assurance',
      penalty: 0,
      status: 'good',
      detail: "Contrat d'assurance actif",
    });
  }

  const score = Math.max(0, Math.min(10, 10 - penalty));
  const grade = gradeFromScore(score);
  const { bg, text, ring } = colorFromGrade(grade);

  return { score, grade, bgClass: bg, textClass: text, ringClass: ring, factors };
}
