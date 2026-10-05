// Shared expense category colors for expense components
import { EXPENSE_TYPE_CONFIG } from '@/lib/utils/expenseTypeConfig';

export interface ExpenseCategory {
  name: string;
  color: string;
  bgColor: string;
  iconPath: string;
}

// Derived from EXPENSE_TYPE_CONFIG (P5.18); this order is the stacking order of the charts
export const EXPENSE_CATEGORIES: ExpenseCategory[] = (
  ['fuel', 'electric_charge', 'insurance', 'maintenance', 'other'] as const
).map((type) => {
  const { label, color, bgClass, iconPath } = EXPENSE_TYPE_CONFIG[type];
  return { name: label, color, bgColor: bgClass, iconPath };
});

export const getCategoryColor = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find((c) => c.name === categoryName);
  return category?.color ?? '#6B7280';
};

export const getCategoryIconPath = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find((c) => c.name === categoryName);
  return category?.iconPath ?? '/icons/stack.svg';
};
