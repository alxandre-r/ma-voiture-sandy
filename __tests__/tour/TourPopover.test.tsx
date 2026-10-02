import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TourPopover from '@/components/tour/TourPopover';

import type { TourChapter, TourStep } from '@/lib/demo/tour/types';
import type { ComponentProps } from 'react';

const CHAPTERS: TourChapter[] = [
  { id: 'a', label: 'Alpha', emoji: '🅰️' },
  { id: 'b', label: 'Bravo', emoji: '🅱️' },
];
const STEPS: TourStep[] = [
  { id: 's1', chapter: 'a', route: '/dashboard', title: 'Un', body: 'Premier.' },
  { id: 's2', chapter: 'a', route: '/dashboard', title: 'Deux', body: 'Deuxième.' },
  { id: 's3', chapter: 'b', route: '/statistics', title: 'Trois', body: 'Troisième.' },
];

function renderPopover(props: Partial<ComponentProps<typeof TourPopover>> = {}) {
  const handlers = {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSkipChapter: vi.fn(),
    onGoToChapter: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <TourPopover
      steps={STEPS}
      chapters={CHAPTERS}
      stepIndex={0}
      targetRect={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
});

describe('TourPopover', () => {
  it('is a labelled dialog that takes the focus', () => {
    renderPopover();
    const dialog = screen.getByRole('dialog', { name: 'Un' });
    expect(dialog).toHaveFocus();
    expect(screen.getByText('Premier.')).toBeInTheDocument();
  });

  it('shows the chapter and the step count', () => {
    renderPopover();
    expect(screen.getByText('🅰️ Alpha')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('disables Précédent on the first step and moves forward', () => {
    const { onNext } = renderPopover();
    expect(screen.getByRole('button', { name: /Précédent/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows Terminer on the last step and moves back', () => {
    const { onNext, onPrev } = renderPopover({ stepIndex: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    fireEvent.click(screen.getByRole('button', { name: /Précédent/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('jumps to a chapter from the progress bar and skips a chapter', () => {
    const { onGoToChapter, onSkipChapter } = renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Aller au chapitre Bravo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Passer ce chapitre' }));
    expect(onGoToChapter).toHaveBeenCalledWith('b');
    expect(onSkipChapter).toHaveBeenCalledTimes(1);
  });

  it('quits with ✕', () => {
    const { onClose } = renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Quitter la visite' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is centered without target', () => {
    renderPopover();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'center');
  });

  it('is anchored below a target with room', () => {
    renderPopover({ targetRect: { top: 100, left: 100, width: 200, height: 50 } });
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'bottom');
  });

  it('becomes a bottom sheet under 640 px', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    renderPopover({ targetRect: { top: 100, left: 10, width: 100, height: 40 } });
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'sheet');
  });

  it('announces the step in a live region', () => {
    renderPopover();
    expect(screen.getByText('Étape 1 sur 3 : Un')).toBeInTheDocument();
  });

  it('shows « Direction … » without controls while navigating', () => {
    renderPopover({ stepIndex: 2, navigatingLabel: 'les statistiques' });
    expect(screen.getByRole('dialog', { name: 'Direction les statistiques…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Suivant|Terminer/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Quitter la visite' })).toBeInTheDocument();
  });
});
