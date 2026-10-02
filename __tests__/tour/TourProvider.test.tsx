import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const nav = vi.hoisted(() => ({ pathname: '/dashboard' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => nav.pathname,
}));

import { TourProvider, useTour } from '@/components/tour/TourProvider';

import type { TourChapter, TourStep } from '@/lib/demo/tour/types';

const KEY = 'test-tour';
const CHAPTERS: TourChapter[] = [
  { id: 'a', label: 'Alpha', emoji: '🅰️' },
  { id: 'b', label: 'Bravo', emoji: '🅱️' },
];
const STEPS: TourStep[] = [
  { id: 's1', chapter: 'a', route: '/dashboard', title: 'Un', body: 'Premier.' },
  {
    id: 's2',
    chapter: 'a',
    route: '/dashboard',
    target: 'menu',
    title: 'Deux',
    body: 'Deuxième.',
    onEnter: { type: 'click', target: 'menu' },
    onExit: { type: 'click-outside' },
  },
  { id: 's3', chapter: 'b', route: '/statistics', title: 'Trois', body: 'Troisième.' },
  { id: 's4', chapter: 'b', route: '/garage?vehicleId=7', title: 'Quatre', body: 'Quatrième.' },
];

function Probe() {
  const tour = useTour();
  if (!tour) return <p>sans visite</p>;
  return (
    <div>
      <p data-testid="status">{tour.status ?? 'chargement'}</p>
      <p data-testid="step">{tour.stepIndex}</p>
      <p data-testid="nav">{tour.isNavigating ? 'oui' : 'non'}</p>
      <button type="button" onClick={() => tour.start()}>
        Démarrer
      </button>
      <button type="button" onClick={tour.resume}>
        Reprendre
      </button>
      <input aria-label="Champ" />
    </div>
  );
}

const onStop = vi.fn();
const tree = (sessionId = 's1') => (
  <TourProvider
    steps={STEPS}
    chapters={CHAPTERS}
    sessionId={sessionId}
    storageKey={KEY}
    onStop={onStop}
  >
    <Probe />
  </TourProvider>
);
const status = () => screen.getByTestId('status').textContent;
const stepIndex = () => screen.getByTestId('step').textContent;
const store = (value: object) => localStorage.setItem(KEY, JSON.stringify(value));
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');
const start = () => fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));

beforeEach(() => {
  nav.pathname = '/dashboard';
  push.mockReset();
  onStop.mockReset();
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('TourProvider', () => {
  it('is null outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText('sans visite')).toBeInTheDocument();
  });

  it('starts on the welcome card for a new session and persists it', () => {
    render(tree());
    expect(status()).toBe('welcome');
    expect(stored()).toEqual({ status: 'welcome', stepIndex: 0, sessionId: 's1' });
  });

  it('restores the progress of the same demo session', () => {
    store({ status: 'paused', stepIndex: 2, sessionId: 's1' });
    render(tree());
    expect(status()).toBe('paused');
    expect(stepIndex()).toBe('2');
  });

  it('starts over for a new demo session', () => {
    store({ status: 'paused', stepIndex: 2, sessionId: 'old' });
    render(tree('s1'));
    expect(status()).toBe('welcome');
  });

  it('survives corrupted or unavailable storage', () => {
    localStorage.setItem(KEY, '{oops');
    const { unmount } = render(tree());
    expect(status()).toBe('welcome');
    unmount();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(tree());
    expect(status()).toBe('welcome');
  });

  it('starts on the first step without navigating when already on its page', () => {
    render(tree());
    start();
    expect(status()).toBe('running');
    expect(stepIndex()).toBe('0');
    expect(stored()).toMatchObject({ status: 'running', stepIndex: 0 });
    expect(push).not.toHaveBeenCalled();
  });

  it('handles → / Enter / ← but never while typing or on a focused button', () => {
    render(tree());
    start();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(stepIndex()).toBe('1');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(stepIndex()).toBe('0');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(stepIndex()).toBe('1');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Champ' }), { key: 'ArrowLeft' });
    expect(stepIndex()).toBe('1');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Démarrer' }), { key: 'Enter' });
    expect(stepIndex()).toBe('1');
  });

  it('quits on Escape and reports it', () => {
    render(tree());
    start();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(status()).toBe('dismissed');
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('navigates to the next page and is not paused by its own navigation', () => {
    store({ status: 'running', stepIndex: 1, sessionId: 's1' });
    const { rerender } = render(tree());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(push).toHaveBeenCalledWith('/statistics');
    expect(screen.getByTestId('nav').textContent).toBe('oui');

    nav.pathname = '/statistics';
    rerender(tree());
    expect(screen.getByTestId('nav').textContent).toBe('non');
    expect(status()).toBe('running');
  });

  it('ignores shortcuts other than Escape while navigating', () => {
    store({ status: 'running', stepIndex: 1, sessionId: 's1' });
    render(tree());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('nav').textContent).toBe('oui');
    expect(stepIndex()).toBe('2');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(stepIndex()).toBe('2');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(status()).toBe('dismissed');
  });

  it('pauses on manual navigation and goes back to the step page on resume', () => {
    const { rerender } = render(tree());
    start();
    nav.pathname = '/garage';
    rerender(tree());
    expect(status()).toBe('paused');

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(status()).toBe('running');
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('pushes a query route even when already on its page (after a reload)', () => {
    nav.pathname = '/garage';
    store({ status: 'running', stepIndex: 3, sessionId: 's1' });
    render(tree());
    expect(push).toHaveBeenCalledWith('/garage?vehicleId=7');
    expect(status()).toBe('running');
  });

  it("runs the step's enter action, then its exit action when leaving it", async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 10,
      width: 50,
      height: 20,
      right: 60,
      bottom: 30,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);
    const onMenuClick = vi.fn();
    const onMouseDown = vi.fn();
    document.addEventListener('mousedown', onMouseDown);
    store({ status: 'running', stepIndex: 1, sessionId: 's1' });
    render(
      <>
        <button type="button" data-tour="menu" onClick={onMenuClick}>
          menu
        </button>
        {tree()}
      </>,
    );
    await waitFor(() => expect(onMenuClick).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => expect(onMouseDown).toHaveBeenCalled());
    document.removeEventListener('mousedown', onMouseDown);
  });

  it("runs the previous step's exit action before the next step's enter action", async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 10,
      width: 50,
      height: 20,
      right: 60,
      bottom: 30,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);
    const steps: TourStep[] = [
      {
        id: 'x',
        chapter: 'a',
        route: '/dashboard',
        title: 'X',
        body: 'Ferme le panneau en sortant.',
        onExit: { type: 'click', target: 'close' },
      },
      {
        id: 'y',
        chapter: 'a',
        route: '/dashboard',
        title: 'Y',
        body: 'Ouvre le menu en entrant.',
        onEnter: { type: 'click', target: 'menu' },
      },
    ];
    const clicks: string[] = [];
    store({ status: 'running', stepIndex: 0, sessionId: 's1' });
    render(
      <>
        <button type="button" data-tour="close" onClick={() => clicks.push('exit')}>
          fermer
        </button>
        <button type="button" data-tour="menu" onClick={() => clicks.push('enter')}>
          menu
        </button>
        <TourProvider steps={steps} chapters={CHAPTERS} sessionId="s1" storageKey={KEY}>
          <Probe />
        </TourProvider>
      </>,
    );
    expect(status()).toBe('running');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(clicks).toEqual(['exit', 'enter']));
  });
});
