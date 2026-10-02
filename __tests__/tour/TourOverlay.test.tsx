import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResumePill from '@/components/tour/ResumePill';
import TourOverlay from '@/components/tour/TourOverlay';

const RECT = { top: 100, left: 50, width: 200, height: 40 };

describe('TourOverlay', () => {
  it('dims the page around a cutout and blocks clicks outside it (z-45)', () => {
    render(<TourOverlay rect={RECT} />);
    expect(screen.getByTestId('tour-veil')).toBeInTheDocument();
    expect(screen.getByTestId('tour-cutout')).toBeInTheDocument();
    const blockers = screen.getAllByTestId('tour-blocker');
    expect(blockers).toHaveLength(4);
    expect(blockers.every((b) => b.className.includes('z-[45]'))).toBe(true);
    expect(screen.getByTestId('tour-halo')).toBeInTheDocument();
  });

  it('leaves the page usable on interactive steps (halo only)', () => {
    render(<TourOverlay rect={RECT} interactive />);
    expect(screen.queryByTestId('tour-veil')).toBeNull();
    expect(screen.queryAllByTestId('tour-blocker')).toHaveLength(0);
    expect(screen.getByTestId('tour-halo')).toBeInTheDocument();
  });

  it('dims and blocks the whole page when the target is missing', () => {
    render(<TourOverlay rect={null} />);
    expect(screen.getAllByTestId('tour-blocker')).toHaveLength(1);
    expect(screen.queryByTestId('tour-cutout')).toBeNull();
    expect(screen.queryByTestId('tour-halo')).toBeNull();
  });
});

describe('ResumePill', () => {
  it('resumes the tour at the current step', () => {
    const onResume = vi.fn();
    render(<ResumePill current={3} total={19} onResume={onResume} onStop={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la visite · 3/19' }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('can quit the tour', () => {
    const onStop = vi.fn();
    render(<ResumePill current={3} total={19} onResume={vi.fn()} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitter la visite' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
