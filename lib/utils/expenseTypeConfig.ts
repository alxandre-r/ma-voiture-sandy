import type { Expense } from '@/types/expense';

export type ExpenseType = Expense['type'];

export interface ExpenseTypeConfig {
  /** Category name, used for grouping in statistics and charts */
  label: string;
  /** `Icon` component name */
  icon: string;
  /** Hex color for charts */
  color: string;
  /** Tailwind classes for the solid badge of an expense row */
  badgeClass: string;
  /** Tailwind classes for a soft category background */
  bgClass: string;
  /** Public SVG of the category (statistics) */
  iconPath: string;
}

/** The single source of truth for each expense type's label, icon and colors. */
export const EXPENSE_TYPE_CONFIG: Record<ExpenseType, ExpenseTypeConfig> = {
  fuel: {
    label: 'Carburant',
    icon: 'car',
    color: '#f26e52', // custom-2 orange
    badgeClass: 'bg-orange-600/90',
    bgClass: 'bg-orange-100/50',
    iconPath: '/icons/expenseCategories/carburant.svg',
  },
  electric_charge: {
    label: 'Électricité',
    icon: 'elec',
    color: '#3b82f6', // blue
    badgeClass: 'bg-blue-600/90',
    bgClass: 'bg-blue-100/50',
    iconPath: '/icons/elec-blue.svg',
  },
  maintenance: {
    label: 'Entretien',
    icon: 'tool',
    color: '#f59e0b', // amber
    badgeClass: 'bg-amber-600/90',
    bgClass: 'bg-amber-100/50',
    iconPath: '/icons/expenseCategories/maintenance.svg',
  },
  insurance: {
    label: 'Assurance',
    icon: 'secure',
    color: '#10b981', // emerald
    badgeClass: 'bg-green-600/90',
    bgClass: 'bg-green-100/50',
    iconPath: '/icons/expenseCategories/assurance.svg',
  },
  other: {
    label: 'Autre',
    icon: 'stack',
    color: '#8b5cf6', // violet
    badgeClass: 'bg-violet-600/90',
    bgClass: 'bg-violet-100/50',
    iconPath: '/icons/expenseCategories/other.svg',
  },
};

/** Display order of the categories (charts, breakdowns, tables). */
export const EXPENSE_TYPES: ExpenseType[] = [
  'fuel',
  'electric_charge',
  'maintenance',
  'insurance',
  'other',
];

/** Config of a type, falling back to 'other' for unknown values. */
export function expenseTypeConfig(type: string): ExpenseTypeConfig {
  return EXPENSE_TYPE_CONFIG[type as ExpenseType] ?? EXPENSE_TYPE_CONFIG.other;
}
