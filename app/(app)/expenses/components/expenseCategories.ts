// Shared expense category colors for expense components

export interface ExpenseCategory {
  name: string;
  color: string;
  bgColor: string;
  iconPath: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    name: 'Carburant',
    color: '#f26e52',
    bgColor: 'bg-orange-100/50',
    iconPath: '/icons/expenseCategories/carburant.svg',
  },
  {
    name: 'Électricité',
    color: '#3B82F6',
    bgColor: 'bg-blue-100/50',
    iconPath: '/icons/elec-blue.svg',
  },
  {
    name: 'Assurance',
    color: '#10B981',
    bgColor: 'bg-green-100/50',
    iconPath: '/icons/expenseCategories/assurance.svg',
  },
  {
    name: 'Entretien',
    color: '#F59E0B',
    bgColor: 'bg-amber-100/50',
    iconPath: '/icons/expenseCategories/maintenance.svg',
  },
  {
    name: 'Autre',
    color: '#8B5CF6',
    bgColor: 'bg-violet-100/50',
    iconPath: '/icons/expenseCategories/other.svg',
  },
];

export const getCategoryColor = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find((c) => c.name === categoryName);
  return category?.color ?? '#6B7280';
};

export const getCategoryIconPath = (categoryName: string): string => {
  const category = EXPENSE_CATEGORIES.find((c) => c.name === categoryName);
  return category?.iconPath ?? '/icons/stack.svg';
};
