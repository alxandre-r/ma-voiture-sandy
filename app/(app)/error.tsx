'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Une erreur est survenue
      </h2>
      {/* Fixed text: Next hides Server Component error messages in production (P3.8) */}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Impossible de charger cette page pour le moment. Vérifiez votre connexion puis réessayez.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-500 select-text">Référence : {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-custom-2 hover:bg-custom-2-hover text-white rounded-lg text-sm font-medium transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
