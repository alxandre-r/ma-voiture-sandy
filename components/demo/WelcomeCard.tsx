'use client';

/**
 * @file components/demo/WelcomeCard.tsx
 * @description First screen of a new demo: guided tour or free exploration.
 * Also exports the card shell shared with FinishCard.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { ReactNode } from 'react';

export const PRIMARY_BUTTON =
  'flex-1 cursor-pointer rounded-xl bg-custom-2 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-custom-2-hover';
export const SECONDARY_BUTTON =
  'flex-1 cursor-pointer rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700';

/** Centered modal card (portal, z-80, bottom-aligned on mobile). Escape triggers onEscape. */
export function DemoCardShell({
  labelledBy,
  onEscape,
  children,
}: {
  labelledBy: string;
  onEscape: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscapeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-900/60 p-4 sm:items-center">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }
        }
        className="w-full max-w-md rounded-2xl bg-white p-6 text-gray-800 shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

interface WelcomeCardProps {
  firstName: string;
  onStart: () => void;
  onExplore: () => void;
}

export default function WelcomeCard({ firstName, onStart, onExplore }: WelcomeCardProps) {
  return (
    <DemoCardShell labelledBy="demo-welcome-title" onEscape={onExplore}>
      <p className="text-3xl" aria-hidden="true">
        👋
      </p>
      <h2
        id="demo-welcome-title"
        className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100"
      >
        Bienvenue dans Ma Voiture.
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Vous êtes {firstName} : 4 véhicules, 2 ans d&apos;historique, une famille… et le droit de
        tout casser — la démo se réinitialise d&apos;un clic.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" autoFocus onClick={onStart} className={PRIMARY_BUTTON}>
          Visite guidée (~3 min)
        </button>
        <button type="button" onClick={onExplore} className={SECONDARY_BUTTON}>
          Explorer librement
        </button>
      </div>
    </DemoCardShell>
  );
}
