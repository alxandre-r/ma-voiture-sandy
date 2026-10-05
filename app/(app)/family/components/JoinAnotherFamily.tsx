'use client';

/**
 * @file JoinAnotherFamily.tsx
 * @fileoverview Section collapsible pour rejoindre une famille supplémentaire.
 * Toujours visible quand l'utilisateur a déjà au moins une famille.
 */

import { useState } from 'react';

import { JoinFamilyForm } from './forms/JoinFamilyForm';

export default function JoinAnotherFamily() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Rejoindre une autre famille
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Utilisez un code d&apos;invitation pour rejoindre un nouveau groupe
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
          <JoinFamilyForm />
        </div>
      )}
    </div>
  );
}
