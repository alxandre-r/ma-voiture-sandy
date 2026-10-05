import { expenseTypeConfig } from '@/lib/utils/expenseTypeConfig';

import type { Expense } from '@/types/expense';


const getCategoryLabel = (expense: Expense) => {
  switch (expense.type) {
    case 'fuel':
      return 'Carburant';
    case 'electric_charge':
      return 'Recharge';
    case 'maintenance':
      return expense.maintenance_type_label || 'Entretien';
    case 'insurance':
      return 'Assurance';
    case 'other':
      return expense.label || 'Autre';
    default:
      return expense.type;
  }
};

const getCategoryColor = (type: string) => expenseTypeConfig(type).badgeClass;

const getCategoryIcon = (type: string) => expenseTypeConfig(type).icon;

export { getCategoryLabel, getCategoryColor, getCategoryIcon };
