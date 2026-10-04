'use client';

import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center bg-gray-50 dark:bg-gray-900">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
        Oops! Une erreur est survenue
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à la page de connexion.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={reset}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-md"
        >
          Réessayer
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium text-sm transition-colors shadow-md"
        >
          Aller à la connexion
        </button>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-400 mt-2 select-text">Référence : {error.digest}</p>
      )}
    </div>
  );
}
