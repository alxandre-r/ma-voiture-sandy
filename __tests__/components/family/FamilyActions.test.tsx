/**
 * @file __tests__/components/family/FamilyActions.test.tsx
 * @description Unit tests for the FamilyActions component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { vi } from 'vitest';

import { FamilyActions } from '@/components/family/FamilyActions';
import { useFamily } from '@/contexts/FamilyContext';
import { useNotifications } from '@/contexts/NotificationContext';

// Mock the family context
vi.mock('@/contexts/FamilyContext', () => ({
  useFamily: vi.fn(),
}));

// Mock the notification context
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('FamilyActions Component', () => {
  const mockUpdateFamily = vi.fn();
  const mockLeaveFamily = vi.fn();
  const mockDeleteFamily = vi.fn();
  const mockShowNotification = vi.fn();
  const mockRefresh = vi.fn();
  const mockOnFamilyUpdated = vi.fn();
  const mockOnFamilyLeft = vi.fn();
  const mockOnFamilyDeleted = vi.fn();

  beforeEach(() => {
    // Setup mocks
    (useFamily as any).mockReturnValue({
      updateFamily: mockUpdateFamily,
      leaveFamily: mockLeaveFamily,
      deleteFamily: mockDeleteFamily,
    });

    (useNotifications as any).mockReturnValue({
      showNotification: mockShowNotification,
    });

    (useRouter as any).mockReturnValue({
      refresh: mockRefresh,
    });

    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock window.confirm
    window.confirm = vi.fn(() => true);
  });

  describe('Owner actions', () => {
    it('should render rename and delete buttons for owners', () => {
      render(
        <FamilyActions
          familyId="test-family-id"
          familyName="Test Family"
          currentUserRole="owner"
          onFamilyUpdated={mockOnFamilyUpdated}
          onFamilyLeft={mockOnFamilyLeft}
          onFamilyDeleted={mockOnFamilyDeleted}
        />,
      );

      expect(screen.getByText('Renommer la famille')).toBeTruthy();
      expect(screen.getByText('Supprimer la famille')).toBeTruthy();
      expect(screen.queryByText('Quitter la famille')).toBeFalsy();
    });

    it('should call updateFamily when rename is submitted', async () => {
      mockUpdateFamily.mockResolvedValue({ id: 'test-family-id', name: 'New Name' });

      render(
        <FamilyActions
          familyId="test-family-id"
          familyName="Test Family"
          currentUserRole="owner"
          onFamilyUpdated={mockOnFamilyUpdated}
          onFamilyLeft={mockOnFamilyLeft}
          onFamilyDeleted={mockOnFamilyDeleted}
        />,
      );

      fireEvent.click(screen.getByText('Renommer la famille'));

      // The modal should be open now
      expect(screen.getByText('Nouveau nom de la famille')).toBeTruthy();
      expect(screen.getByPlaceholderText('Entrez le nouveau nom')).toBeTruthy();

      fireEvent.change(screen.getByPlaceholderText('Entrez le nouveau nom'), {
        target: { value: 'New Family Name' },
      });
      fireEvent.click(screen.getByText('Enregistrer'));

      await waitFor(() => {
        expect(mockUpdateFamily).toHaveBeenCalledWith('test-family-id', 'New Family Name');
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Famille renommée avec succès',
          'success',
        );
        expect(mockOnFamilyUpdated).toHaveBeenCalled();
      });
    });

    it('should call deleteFamily when delete button is clicked', async () => {
      mockDeleteFamily.mockResolvedValue(true);

      render(
        <FamilyActions
          familyId="test-family-id"
          familyName="Test Family"
          currentUserRole="owner"
          onFamilyUpdated={mockOnFamilyUpdated}
          onFamilyLeft={mockOnFamilyLeft}
          onFamilyDeleted={mockOnFamilyDeleted}
        />,
      );

      fireEvent.click(screen.getByText('Supprimer la famille'));

      // The confirmation modal should be open now
      expect(
        screen.getByText(
          'Êtes-vous sûr de vouloir supprimer cette famille ? Cette action est irréversible et supprimera tous les membres de la famille.',
        ),
      ).toBeTruthy();

      fireEvent.click(screen.getByText('Supprimer'));

      await waitFor(() => {
        expect(mockDeleteFamily).toHaveBeenCalledWith('test-family-id');
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Famille supprimée avec succès',
          'success',
        );
        expect(mockOnFamilyDeleted).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Member actions', () => {
    it('should render leave button for members', () => {
      render(
        <FamilyActions
          familyId="test-family-id"
          familyName="Test Family"
          currentUserRole="member"
          onFamilyUpdated={mockOnFamilyUpdated}
          onFamilyLeft={mockOnFamilyLeft}
          onFamilyDeleted={mockOnFamilyDeleted}
        />,
      );

      expect(screen.getByText('Quitter la famille')).toBeTruthy();
      expect(screen.queryByText('Renommer la famille')).toBeFalsy();
      expect(screen.queryByText('Supprimer la famille')).toBeFalsy();
    });

    it('should call leaveFamily when leave button is clicked', async () => {
      mockLeaveFamily.mockResolvedValue(true);

      render(
        <FamilyActions
          familyId="test-family-id"
          familyName="Test Family"
          currentUserRole="member"
          onFamilyUpdated={mockOnFamilyUpdated}
          onFamilyLeft={mockOnFamilyLeft}
          onFamilyDeleted={mockOnFamilyDeleted}
        />,
      );

      fireEvent.click(screen.getByText('Quitter la famille'));

      // The confirmation modal should be open now
      expect(
        screen.getByText(
          "Êtes-vous sûr de vouloir quitter cette famille ? Vous perdrez l'accès aux véhicules et aux données partagées par les autres membres.",
        ),
      ).toBeTruthy();

      fireEvent.click(screen.getByText('Quitter'));

      await waitFor(() => {
        expect(mockLeaveFamily).toHaveBeenCalledWith('test-family-id');
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Vous avez quitté la famille avec succès',
          'success',
        );
        expect(mockOnFamilyLeft).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  it('should handle errors gracefully', async () => {
    mockUpdateFamily.mockRejectedValue(new Error('Update failed'));

    render(
      <FamilyActions
        familyId="test-family-id"
        familyName="Test Family"
        currentUserRole="owner"
        onFamilyUpdated={mockOnFamilyUpdated}
        onFamilyLeft={mockOnFamilyLeft}
        onFamilyDeleted={mockOnFamilyDeleted}
      />,
    );

    fireEvent.click(screen.getByText('Renommer la famille'));
    fireEvent.change(screen.getByPlaceholderText('Entrez le nouveau nom'), {
      target: { value: 'New Family Name' },
    });
    fireEvent.click(screen.getByText('Enregistrer'));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith('Update failed', 'error');
      expect(mockOnFamilyUpdated).not.toHaveBeenCalled();
    });
  });
});
