import React from 'react';

import Spinner from '@/components/common/ui/Spinner';

import { Modal } from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'primary' | 'gray';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmButtonColor = 'primary',
  isLoading = false,
}) => {
  // Button color classes
  const buttonColors = {
    red: 'bg-red-600 hover:bg-red-700',
    primary: 'bg-custom-1 hover:bg-custom-1-hover',
    gray: 'bg-gray-600 hover:bg-gray-700',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">{message}</p>

        <div className="flex justify-end gap-3">
          {cancelText && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 bg-gray-200 hover:cursor-pointer dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white hover:cursor-pointer rounded-lg transition-colors ${buttonColors[confirmButtonColor]} ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner color="white" />
                {confirmText}...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
