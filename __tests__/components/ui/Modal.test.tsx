/**
 * @file __tests__/components/ui/Modal.test.tsx
 * @description Unit tests for the Modal component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { Modal } from '@/components/common/ui/Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Modal Content')).toBeTruthy();
  });

  it('should call onClose when clicking outside', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    // Click on the backdrop (outside the modal)
    const backdrop = container.querySelector('.fixed');
    if (backdrop) {
      fireEvent.mouseDown(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when pressing Escape', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call onClose when clicking inside the modal', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    const modalContent = screen.getByText('Modal Content');
    fireEvent.mouseDown(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should have the correct backdrop style', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );

    const backdrop = container.firstChild;
    expect(backdrop).toBeTruthy();
    // Verify backdrop classes are present
    expect(backdrop?.className).toContain('bg-black/50');
    expect(backdrop?.className).toContain('backdrop-blur-sm');
  });
});
