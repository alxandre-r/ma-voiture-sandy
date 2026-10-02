'use client';

/**
 * @file components/tour/ResumePill.tsx
 * @description Floating pill shown while the tour is paused (the visitor navigated on their own).
 */

import { createPortal } from 'react-dom';

interface ResumePillProps {
  current: number;
  total: number;
  onResume: () => void;
  onStop: () => void;
}

export default function ResumePill({ current, total, onResume, onStop }: ResumePillProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900 py-1 pl-4 pr-1 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900 sm:bottom-6">
      <button type="button" onClick={onResume} className="cursor-pointer font-medium">
        {`Reprendre la visite · ${current}/${total}`}
      </button>
      <button
        type="button"
        onClick={onStop}
        aria-label="Quitter la visite"
        className="cursor-pointer rounded-full px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white dark:text-gray-500 dark:hover:bg-gray-200 dark:hover:text-gray-900"
      >
        ✕
      </button>
    </div>,
    document.body,
  );
}
