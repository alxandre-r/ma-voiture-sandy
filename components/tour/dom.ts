/**
 * @file components/tour/dom.ts
 * @description DOM helpers of the tour engine: find the visible copy of a data-tour anchor
 * (the header renders some anchors twice, desktop and mobile), wait for it, run scripted
 * actions, scroll it under the sticky header, and keyboard guards.
 */

import type { Rect } from './placement';
import type { TourAction } from '@/lib/demo/tour/types';

/** Max wait for a target (streaming, client fetches, entry animations) */
export const TARGET_TIMEOUT_MS = 4000;
const POLL_MS = 250;
const SCROLL_MARGIN = 16;
/** On mobile the bottom 45 % of the screen is covered by the popover sheet */
const MOBILE_VISIBLE_RATIO = 0.55;

interface WaitOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Hidden elements (display: none, or inside a hidden parent) have an empty box */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** First visible element with data-tour="<id>", or null */
export function findVisibleTarget(id: string, root: ParentNode = document): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  return candidates.find(isVisible) ?? null;
}

/** Resolves with the visible target as soon as it appears, or null after the timeout / abort */
export function waitForTarget(
  id: string,
  { timeoutMs = TARGET_TIMEOUT_MS, signal }: WaitOptions = {},
): Promise<HTMLElement | null> {
  const immediate = findVisibleTarget(id);
  if (immediate || signal?.aborted) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;

    function settle(el: HTMLElement | null) {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearInterval(poll);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(el);
    }
    function check() {
      const el = findVisibleTarget(id);
      if (el) settle(el);
    }
    function onAbort() {
      settle(null);
    }

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-tour'],
    });
    // Visibility can change without any DOM mutation (CSS transitions, media queries)
    const poll = setInterval(check, POLL_MS);
    const timer = setTimeout(() => settle(null), timeoutMs);
    signal?.addEventListener('abort', onAbort);
  });
}

/** Runs a scripted step action. Resolves to false when its target never showed up. */
export async function runTourAction(
  action: TourAction,
  options: WaitOptions = {},
): Promise<boolean> {
  if (action.type === 'click-outside') {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return true;
  }
  const el = await waitForTarget(action.target, options);
  if (!el || options.signal?.aborted) return false;
  el.click();
  return true;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Height of the sticky app header (components/Header.tsx) */
export function getStickyOffset(): number {
  const header = document.querySelector('header');
  return header instanceof HTMLElement ? header.offsetHeight : 0;
}

/** Scrolls the target just under the sticky header (upper half of the screen on mobile) */
export function scrollTargetIntoView(el: HTMLElement, { mobile = false } = {}): void {
  if (el.closest('header')) return; // part of the sticky header: always on screen
  const rect = el.getBoundingClientRect();
  const top = getStickyOffset() + SCROLL_MARGIN;
  const bottom =
    (mobile ? window.innerHeight * MOBILE_VISIBLE_RATIO : window.innerHeight) - SCROLL_MARGIN;
  if (rect.top >= top && rect.bottom <= bottom) return;
  window.scrollTo({
    top: Math.max(0, window.scrollY + rect.top - top),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

/** Keyboard shortcuts must not fire while the visitor types */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return target.closest('[contenteditable=""], [contenteditable="true"]') !== null;
}

/** Enter on a focused button or link already activates it: the tour must not also advance */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a[href], [role="button"], summary') !== null
  );
}

export function toRect(rect: DOMRectReadOnly): Rect {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function sameRect(a: Rect, b: Rect, tolerance = 0.5): boolean {
  return (
    Math.abs(a.top - b.top) <= tolerance &&
    Math.abs(a.left - b.left) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}
