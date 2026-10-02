'use client';

/**
 * @file components/demo/DemoBanner.tsx
 * @description Thin banner above the header in demo mode: persona, reset, sign-up and exit.
 * Renders nothing outside the demo.
 */

import { useState } from 'react';

import { ConfirmationModal } from '@/components/common/ui/ConfirmationModal';
import Icon from '@/components/common/ui/Icon';
import { useDemo } from '@/contexts/DemoContext';
import { useUser } from '@/contexts/UserContext';

const BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-medium transition-colors cursor-pointer';

export default function DemoBanner() {
  const demo = useDemo();
  const user = useUser();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!demo) return null;

  const firstName = user.name.split(' ')[0];

  const handleReset = async () => {
    setResetting(true);
    const ok = await demo.reset();
    setResetting(false);
    if (ok) setConfirmReset(false);
  };

  return (
    <div
      role="region"
      aria-label="Mode démo"
      className="flex items-center justify-between gap-3 border-b border-custom-1/20 bg-custom-1/10 px-4 py-2 text-sm text-gray-800 dark:bg-custom-1/20 dark:text-gray-100 sm:px-6"
    >
      <p className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true">🧪</span>
        <span className="shrink-0 font-semibold">Mode démo</span>
        <span className="hidden truncate text-gray-600 dark:text-gray-300 md:inline">
          · données fictives — vous êtes {firstName}
        </span>
      </p>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          aria-label="Réinitialiser la démo"
          className={`${BUTTON} text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          <Icon name="history" size={14} />
          <span className="hidden sm:inline">Réinitialiser</span>
        </button>
        <button
          type="button"
          onClick={() => demo.exit({ signup: true })}
          aria-label="Créer un compte"
          className={`${BUTTON} bg-custom-2 text-white hover:bg-custom-2-hover`}
        >
          <span className="sm:hidden">S&apos;inscrire</span>
          <span className="hidden sm:inline">Créer un compte</span>
        </button>
        <button
          type="button"
          onClick={() => demo.exit()}
          aria-label="Quitter la démo"
          title="Quitter la démo"
          className={`${BUTTON} text-gray-500 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-800`}
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <ConfirmationModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Réinitialiser la démo"
        message="Toutes vos modifications seront effacées et les données d'origine restaurées."
        confirmText="Oui, réinitialiser"
        isLoading={resetting}
      />
    </div>
  );
}
