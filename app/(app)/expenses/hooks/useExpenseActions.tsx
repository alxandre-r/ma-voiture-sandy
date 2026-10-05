// Expense deletion for the expenses page (editing goes through the shared expense forms)
import { useNotifications } from '@/contexts/NotificationContext';

export function useExpenseActions() {
  const { showSuccess, showError } = useNotifications();

  /** --- Delete an expense --- */
  const deleteExpense = async (expenseId: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/expenses/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Erreur lors de la suppression de la dépense');
      }

      showSuccess('Dépense supprimée avec succès !');
      return true;
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      return false;
    }
  };

  return { deleteExpense };
}
