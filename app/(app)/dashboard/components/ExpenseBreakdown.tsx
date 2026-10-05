'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { EXPENSE_TYPE_CONFIG, EXPENSE_TYPES } from '@/lib/utils/expenseTypeConfig';
import { formatCurrency } from '@/lib/utils/format';

import type { Expense } from '@/types/expense';

interface ExpenseBreakdownProps {
  expenses: Expense[];
}

const CATEGORIES = EXPENSE_TYPES.map((type) => {
  const { label, icon, color } = EXPENSE_TYPE_CONFIG[type];
  return { key: type, label, types: [type], icon, color };
});

export default function ExpenseBreakdown({ expenses }: ExpenseBreakdownProps) {
  if (expenses.length === 0) return null;

  const total = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  if (total === 0) return null;

  const categories = CATEGORIES.map((cat) => {
    const amount = expenses
      .filter((e) => cat.types.includes(e.type))
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const pct = total > 0 ? (amount / total) * 100 : 0;
    return { ...cat, amount, pct };
  }).filter((c) => c.amount > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="chart" size={18} />
          <CardTitle>Répartition des dépenses</CardTitle>
        </div>
        <Link href="/statistics" className="text-sm font-medium text-custom-1 hover:underline">
          Statistiques
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon name={cat.icon} size={14} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tabular-nums">
                    {cat.pct.toFixed(0)}%
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-20 text-right">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-900/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
