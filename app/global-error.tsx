/**
 * @file app/global-error.tsx
 * @fileoverview Last-resort error boundary: replaces the root layout when the layout itself fails,
 * so it renders its own <html>/<body>. Light theme only: the theme provider and fonts of the root
 * layout are not available here (globals.css is imported for the Tailwind classes).
 */

'use client';

import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center text-gray-800">
          <h1 className="text-2xl font-semibold text-gray-900">Une erreur est survenue</h1>
          {/* Fixed text: the raw message may be technical, and is hidden in production anyway */}
          <p className="max-w-md text-gray-600">
            L&apos;application n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; si le
            problème persiste, rechargez la page.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-custom-2 px-5 py-2 text-sm font-medium text-white hover:bg-custom-2-hover"
            >
              Réessayer
            </button>
            {/* Full reload: a client navigation would reuse the broken layout */}
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
            >
              Accueil
            </button>
          </div>
          {error.digest && (
            <p className="select-text text-xs text-gray-500">Référence : {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
