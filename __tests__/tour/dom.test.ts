import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  findVisibleTarget,
  isEditableTarget,
  isInteractiveTarget,
  runTourAction,
  scrollTargetIntoView,
  waitForTarget,
} from '@/components/tour/dom';

type RectInit = { top: number; left: number; width: number; height: number };
const VISIBLE: RectInit = { top: 100, left: 40, width: 300, height: 80 };

/** jsdom has no layout: give the element a measurable box before it enters the DOM */
function anchor(id: string, rect: RectInit | null, parent: HTMLElement = document.body) {
  const el = document.createElement('div');
  el.dataset.tour = id;
  const box = rect ?? { top: 0, left: 0, width: 0, height: 0 };
  el.getBoundingClientRect = () =>
    ({
      ...box,
      x: box.left,
      y: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      toJSON: () => ({}),
    }) as DOMRect;
  if (!rect) el.style.display = 'none';
  parent.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('findVisibleTarget (Review Focus #4)', () => {
  it('picks the visible copy when the anchor is rendered twice', () => {
    anchor('header-filters', null); // desktop copy, hidden on mobile
    const mobileCopy = anchor('header-filters', VISIBLE);
    expect(findVisibleTarget('header-filters')).toBe(mobileCopy);
  });

  it('returns null when every copy is hidden', () => {
    anchor('header-filters', null);
    expect(findVisibleTarget('header-filters')).toBeNull();
  });
});

describe('waitForTarget', () => {
  it('resolves as soon as the target appears', async () => {
    const pending = waitForTarget('late', { timeoutMs: 1000 });
    setTimeout(() => anchor('late', VISIBLE), 20);
    const el = await pending;
    expect(el?.dataset.tour).toBe('late');
  });

  it('gives up after the timeout', async () => {
    await expect(waitForTarget('never', { timeoutMs: 30 })).resolves.toBeNull();
  });

  it('stops waiting when aborted', async () => {
    const controller = new AbortController();
    const pending = waitForTarget('never', { timeoutMs: 1000, signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toBeNull();
  });
});

describe('runTourAction', () => {
  it('clicks the visible target', async () => {
    const el = anchor('menu', VISIBLE);
    const onClick = vi.fn();
    el.addEventListener('click', onClick);
    await expect(runTourAction({ type: 'click', target: 'menu' })).resolves.toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reports a missing target without throwing', async () => {
    await expect(
      runTourAction({ type: 'click', target: 'absent' }, { timeoutMs: 30 }),
    ).resolves.toBe(false);
  });

  it('closes menus with a mousedown outside of them', async () => {
    const onMouseDown = vi.fn();
    document.addEventListener('mousedown', onMouseDown);
    await runTourAction({ type: 'click-outside' });
    document.removeEventListener('mousedown', onMouseDown);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });
});

describe('keyboard guards', () => {
  it('detects form fields and interactive elements', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const button = document.createElement('button');
    document.body.append(input, textarea, select, editable, button);

    expect([input, textarea, select, editable].every(isEditableTarget)).toBe(true);
    expect(isEditableTarget(button)).toBe(false);
    expect(isEditableTarget(window)).toBe(false);
    expect(isInteractiveTarget(button)).toBe(true);
    expect(isInteractiveTarget(document.body)).toBe(false);
  });
});

describe('scrollTargetIntoView', () => {
  it('scrolls a target below the fold to just under the header', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollTargetIntoView(anchor('far', { top: 2000, left: 0, width: 100, height: 100 }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1984, behavior: 'smooth' });
  });

  it('leaves a target that is already visible alone', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollTargetIntoView(anchor('near', VISIBLE));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('never scrolls for an element of the sticky header', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const header = document.createElement('header');
    document.body.appendChild(header);
    scrollTargetIntoView(anchor('search', { top: -40, left: 0, width: 100, height: 30 }, header));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the target in the upper half of the screen on mobile', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // jsdom viewport: 768 px high → the lower 45 % is the bottom sheet
    scrollTargetIntoView(anchor('mid', { top: 500, left: 0, width: 100, height: 100 }), {
      mobile: true,
    });
    expect(scrollTo).toHaveBeenCalledWith({ top: 484, behavior: 'smooth' });
  });
});
