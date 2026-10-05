import { EXPENSE_CATEGORIES } from '@/app/(app)/expenses/components/expenseCategories';
import { CATEGORY_COLORS } from '@/lib/utils/chartColors';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils/expensesUtils';
import { EXPENSE_TYPE_CONFIG, expenseTypeConfig } from '@/lib/utils/expenseTypeConfig';
import { getCategoryName } from '@/types/expense';

describe('expense type config (single source, P5.18)', () => {
  it('keeps the statistics categories and their stacking order', () => {
    expect(EXPENSE_CATEGORIES.map((c) => c.name)).toEqual([
      'Carburant',
      'Électricité',
      'Assurance',
      'Entretien',
      'Autre',
    ]);
    expect(EXPENSE_CATEGORIES[0].color).toBe(EXPENSE_TYPE_CONFIG.fuel.color);
  });

  it('feeds the chart colors, including the merged energy key', () => {
    expect(CATEGORY_COLORS.electric_charge).toBe('#3b82f6');
    expect(CATEGORY_COLORS.energy).toBe(CATEGORY_COLORS.fuel);
  });

  it('feeds the row badge and icon helpers, falling back to other', () => {
    expect(getCategoryColor('maintenance')).toBe('bg-amber-600/90');
    expect(getCategoryIcon('insurance')).toBe('secure');
    expect(getCategoryIcon('unknown')).toBe(EXPENSE_TYPE_CONFIG.other.icon);
    expect(expenseTypeConfig('unknown')).toBe(EXPENSE_TYPE_CONFIG.other);
  });

  it('names the categories', () => {
    expect(getCategoryName('electric_charge')).toBe('Électricité');
    expect(getCategoryName('weird')).toBe('Autre');
  });
});
