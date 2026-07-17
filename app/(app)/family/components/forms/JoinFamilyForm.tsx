'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import Button from '@/components/common/ui/Button';
import { useNotifications } from '@/contexts/NotificationContext';

export function JoinFamilyForm({
  onFamilyJoined,
}: {
  onFamilyJoined?: (family: {
    id: string;
    name: string;
    created_at: string;
    owner: string;
    userRole: string;
  }) => void;
}) {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { showNotification } = useNotifications();

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      showNotification("Veuillez entrer un code d'invitation", 'error');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/family/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la jointure de la famille');
      }

      showNotification('Vous avez rejoint la famille avec succès !', 'success');

      if (onFamilyJoined) {
        onFamilyJoined(data.family);
      }

      router.push('/family');
    } catch (error) {
      console.error('Error joining family:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur lors de la jointure de la famille';
      showNotification(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoinFamily} className="space-y-4">
      <div>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Entrez le code d'invitation"
          required
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
          focus:outline-none focus:ring-2 focus:ring-custom-1 
          bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
        {isLoading ? 'Rejoindre en cours…' : 'Rejoindre la famille'}
      </Button>
    </form>
  );
}
