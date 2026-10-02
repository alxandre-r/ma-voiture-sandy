'use client';

/**
 * @file contexts/DemoContext.tsx
 * @description Demo controls, provided only in demo mode (see AppDataProvider).
 * useDemo() returns null outside the demo, so shared components can adapt safely.
 */

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { useNotifications } from '@/contexts/NotificationContext';
import { clearTourStorage, exitDemoSession } from '@/lib/demo/client';

import type { ReactNode } from 'react';

interface DemoContextValue {
  sessionId: string;
  /** Restores the original demo data. Resolves to false when it failed. */
  reset: () => Promise<boolean>;
  /** Leaves the demo, to the landing page (or straight to its sign-up form). */
  exit: (options?: { signup?: boolean }) => Promise<void>;
}

const DemoContext = createContext<DemoContextValue | null>(null);

/** Demo controls, or null outside the demo. */
export function useDemo(): DemoContextValue | null {
  return useContext(DemoContext);
}

export function DemoProvider({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();

  const reset = useCallback(async () => {
    const res = await fetch('/api/demo/reset', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      showError('Impossible de réinitialiser la démo. Rechargez la page.');
      return false;
    }
    router.refresh();
    showSuccess("Démo réinitialisée : les données d'origine sont de retour.");
    return true;
  }, [router, showError, showSuccess]);

  const exit = useCallback(async (options?: { signup?: boolean }) => {
    await exitDemoSession();
    clearTourStorage();
    // Full reload so no demo data survives in the client router cache
    window.location.href = options?.signup ? '/?mode=signup' : '/';
  }, []);

  const value = useMemo(() => ({ sessionId, reset, exit }), [sessionId, reset, exit]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
