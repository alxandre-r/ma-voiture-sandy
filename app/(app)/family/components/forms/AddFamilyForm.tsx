import { useRouter } from 'next/navigation';
import React, { useState, useRef } from 'react';

import Button from '@/components/common/ui/Button';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFormSubmitOnEnter } from '@/hooks/useFormSubmitOnEnter';

interface FamilyFormProps {
  onFamilyCreated?: (family: {
    id: string;
    name: string;
    created_at: string;
    owner: string;
  }) => void;
}

export const AddFamilyForm: React.FC<FamilyFormProps> = ({ onFamilyCreated }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showNotification } = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/family/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la famille');
      }

      showNotification('Famille créée avec succès !', 'success');

      if (onFamilyCreated) {
        onFamilyCreated(data.family);
      }

      // Refresh the page to show the family
      router.refresh();
    } catch (error) {
      console.error('Error creating family:', error);
      showNotification(
        error instanceof Error ? error.message : 'Erreur lors de la création de la famille',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add Enter key support
  useFormSubmitOnEnter(
    inputRef,
    () => {
      if (name.trim()) {
        handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
      }
    },
    isLoading,
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Entrez le nom de votre famille"
          required
          minLength={2}
          maxLength={100}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
          focus:outline-none focus:ring-2 focus:ring-custom-2 
          bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
        />
      </div>

      <Button type="submit" variant="secondary" isLoading={isLoading} className="w-full">
        {isLoading ? 'Création en cours…' : 'Créer la famille'}
      </Button>
    </form>
  );
};
