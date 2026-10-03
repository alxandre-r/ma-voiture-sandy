/**
 * @file __tests__/components/family/FamilyForm.test.tsx
 * @description Unit tests for the FamilyForm component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { vi } from 'vitest';

import { FamilyForm } from '@/components/family';
import { useNotifications } from '@/contexts/NotificationContext';

// Mock the notification context
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('FamilyForm Component', () => {
  const mockShowNotification = vi.fn();
  const mockRefresh = vi.fn();
  const mockOnFamilyCreated = vi.fn();

  beforeEach(() => {
    // Setup mocks
    (useNotifications as any).mockReturnValue({
      showNotification: mockShowNotification,
    });

    (useRouter as any).mockReturnValue({
      refresh: mockRefresh,
    });

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should render the family form correctly', () => {
    render(<FamilyForm onFamilyCreated={mockOnFamilyCreated} />);

    // Check if the form elements are rendered
    expect(screen.getByLabelText('Nom de la famille')).toBeTruthy();
    expect(screen.getByPlaceholderText('Entrez le nom de votre famille')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Créer la famille' })).toBeTruthy();
  });

  it('should validate form input', async () => {
    render(<FamilyForm onFamilyCreated={mockOnFamilyCreated} />);

    const input = screen.getByLabelText('Nom de la famille');
    const button = screen.getByRole('button', { name: 'Créer la famille' });

    // Try to submit with empty input
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(button);

    // Should not submit
    await waitFor(() => {
      expect(mockShowNotification).not.toHaveBeenCalled();
    });
  });

  it('should call the API and handle successful family creation', async () => {
    // Mock the global fetch
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Famille créée avec succès',
        family: {
          id: 'test-family-id',
          name: 'Test Family',
          created_at: '2023-01-01T00:00:00Z',
          owner: 'test-user-id',
        },
      }),
    });

    render(<FamilyForm onFamilyCreated={mockOnFamilyCreated} />);

    const input = screen.getByLabelText('Nom de la famille');
    const button = screen.getByRole('button', { name: 'Créer la famille' });

    // Fill the form and submit
    fireEvent.change(input, { target: { value: 'Test Family' } });
    fireEvent.click(button);

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/family/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Family' }),
      });

      expect(mockShowNotification).toHaveBeenCalledWith('Famille créée avec succès !', 'success');

      expect(mockOnFamilyCreated).toHaveBeenCalledWith({
        id: 'test-family-id',
        name: 'Test Family',
        created_at: '2023-01-01T00:00:00Z',
        owner: 'test-user-id',
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    // Clean up
    delete global.fetch;
  });

  it('should handle API errors gracefully', async () => {
    // Mock the global fetch to return an error
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Erreur lors de la création de la famille',
      }),
    });

    render(<FamilyForm onFamilyCreated={mockOnFamilyCreated} />);

    const input = screen.getByLabelText('Nom de la famille');
    const button = screen.getByRole('button', { name: 'Créer la famille' });

    // Fill the form and submit
    fireEvent.change(input, { target: { value: 'Test Family' } });
    fireEvent.click(button);

    // Wait for the error handling
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Erreur lors de la création de la famille',
        'error',
      );
      expect(mockOnFamilyCreated).not.toHaveBeenCalled();
    });

    // Clean up
    delete global.fetch;
  });
});
