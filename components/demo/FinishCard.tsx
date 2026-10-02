'use client';

/**
 * @file components/demo/FinishCard.tsx
 * @description Last screen of the guided tour: sign up, or keep exploring the demo.
 */

import { DemoCardShell, PRIMARY_BUTTON, SECONDARY_BUTTON } from './WelcomeCard';

interface FinishCardProps {
  onSignup: () => void;
  onContinue: () => void;
}

export default function FinishCard({ onSignup, onContinue }: FinishCardProps) {
  return (
    <DemoCardShell labelledBy="demo-finish-title" onEscape={onContinue}>
      <p className="text-3xl" aria-hidden="true">
        🎉
      </p>
      <h2
        id="demo-finish-title"
        className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100"
      >
        Vous avez fait le tour !
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Ajoutez un plein, terminez un rappel, cassez tout : la démo se réinitialise d&apos;un clic.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" autoFocus onClick={onSignup} className={PRIMARY_BUTTON}>
          Créer mon compte
        </button>
        <button type="button" onClick={onContinue} className={SECONDARY_BUTTON}>
          Continuer à explorer
        </button>
      </div>
    </DemoCardShell>
  );
}
