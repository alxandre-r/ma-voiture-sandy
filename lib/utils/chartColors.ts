/**
 * Constantes de couleurs pour les graphiques — alignées sur la charte custom-1/custom-2.
 * Centralise toutes les couleurs hex utilisées dans Recharts pour éviter la divergence.
 */
import { EXPENSE_TYPE_CONFIG } from '@/lib/utils/expenseTypeConfig';

/** Chart color per expense type, from EXPENSE_TYPE_CONFIG; `energy` = fuel + charge together. */
export const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(EXPENSE_TYPE_CONFIG).map(([type, config]) => [type, config.color]),
  ),
  energy: EXPENSE_TYPE_CONFIG.fuel.color,
};

/** Palette pour les lignes multi-véhicules dans les charts (quand pas de couleur véhicule) */
export const VEHICLE_LINE_COLORS = [
  '#f26e52', // custom-2 orange
  '#7e47ff', // custom-1 violet
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet clair
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#ef4444', // red
];

/** Couleurs des axes et grilles Recharts (light mode — dark géré dans globals.css) */
export const CHART_AXIS = {
  grid: '#e2e8f0',
  tick: '#94a3b8',
  axis: '#e2e8f0',
};

/** Fallback couleur neutre */
export const CHART_FALLBACK_COLOR = '#6b7280';

/** Retourne la couleur d'une catégorie de dépense */
export function getCategoryColor(type: string): string {
  return CATEGORY_COLORS[type] ?? CHART_FALLBACK_COLOR;
}
