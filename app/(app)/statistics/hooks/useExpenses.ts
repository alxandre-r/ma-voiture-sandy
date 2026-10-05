import { useEffect, useRef, useState } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';

import type { Expense } from '@/types/expense';

interface UseExpensesResult {
  expenses: Expense[];
  isLoading: boolean;
  isError: boolean;
}

const LOAD_ERROR = 'Impossible de charger les statistiques.';

/**
 * Fetches all expenses for the given vehicle IDs from the API.
 * On failure: the first load sets `isError` (error screen); a later refetch keeps the
 * previous data on screen and shows an error toast instead.
 */
export function useExpenses(vehicleIds: number[]): UseExpensesResult {
  const { showError } = useNotifications();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const hasLoaded = useRef(false);
  // NotificationContext recreates showError on every render: read it through a ref so a toast
  // (which re-renders the provider) does not re-trigger the fetch
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  useEffect(() => {
    if (!vehicleIds.length) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/expenses/get?vehicleIds=${vehicleIds.join(',')}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(body?.expenses)) {
          throw new Error(typeof body?.error === 'string' ? body.error : LOAD_ERROR);
        }
        return body.expenses as Expense[];
      })
      .then((data) => {
        if (cancelled) return;
        hasLoaded.current = true;
        setExpenses(data);
        setIsError(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (hasLoaded.current) {
          // Keep the previous data visible
          showErrorRef.current(err instanceof Error && err.message ? err.message : LOAD_ERROR);
        } else {
          setIsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleIds]);

  return { expenses, isLoading, isError };
}
