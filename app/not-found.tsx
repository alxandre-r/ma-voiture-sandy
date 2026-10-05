/**
 * @file app/not-found.tsx
 * @fileoverview 404 page for unknown URLs (and notFound() calls), rendered inside the root layout.
 */

import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page introuvable · Ma voiture',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-6xl font-bold text-custom-2" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Page introuvable</h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse, ou repartez de
        l&apos;une de ces pages.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-lg bg-custom-2 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-custom-2-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-custom-2 focus-visible:ring-offset-2"
        >
          Tableau de bord
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Accueil
        </Link>
      </div>
    </main>
  );
}
