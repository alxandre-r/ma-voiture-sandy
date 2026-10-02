/**
 * @file components/tour/placement.ts
 * @description Pure placement of the tour popover. It sits next to the target, flips when space
 * is missing, and always stays inside the viewport. Without a target it is centered; under
 * 640 px it becomes a bottom sheet.
 */

import type { TourPlacement } from '@/lib/demo/tour/types';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export type PopoverPosition =
  | { mode: 'anchored'; side: Side; top: number; left: number }
  | { mode: 'center'; top: number; left: number }
  | { mode: 'sheet' };

export const MOBILE_BREAKPOINT = 640;
export const POPOVER_WIDTH = 360;
export const POPOVER_GAP = 12;
export const POPOVER_MARGIN = 16;

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const AUTO_ORDER: Side[] = ['bottom', 'top', 'right', 'left'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function sideOrder(preferred: TourPlacement): Side[] {
  if (preferred === 'auto') return AUTO_ORDER;
  const opposite = OPPOSITE[preferred];
  return [preferred, opposite, ...AUTO_ORDER.filter((s) => s !== preferred && s !== opposite)];
}

function fits(side: Side, target: Rect, popover: Size, viewport: Size): boolean {
  switch (side) {
    case 'bottom':
      return (
        target.top + target.height + POPOVER_GAP + popover.height <=
        viewport.height - POPOVER_MARGIN
      );
    case 'top':
      return target.top - POPOVER_GAP - popover.height >= POPOVER_MARGIN;
    case 'right':
      return (
        target.left + target.width + POPOVER_GAP + popover.width <= viewport.width - POPOVER_MARGIN
      );
    case 'left':
      return target.left - POPOVER_GAP - popover.width >= POPOVER_MARGIN;
  }
}

export function computePopoverPosition({
  target,
  popover,
  viewport,
  preferred = 'auto',
}: {
  target: Rect | null;
  popover: Size;
  viewport: Size;
  preferred?: TourPlacement;
}): PopoverPosition {
  if (viewport.width < MOBILE_BREAKPOINT) return { mode: 'sheet' };

  const maxTop = viewport.height - popover.height - POPOVER_MARGIN;
  const maxLeft = viewport.width - popover.width - POPOVER_MARGIN;

  if (!target) {
    return {
      mode: 'center',
      top: clamp((viewport.height - popover.height) / 2, POPOVER_MARGIN, maxTop),
      left: clamp((viewport.width - popover.width) / 2, POPOVER_MARGIN, maxLeft),
    };
  }

  const alignedLeft = clamp(
    target.left + target.width / 2 - popover.width / 2,
    POPOVER_MARGIN,
    maxLeft,
  );
  const alignedTop = clamp(
    target.top + target.height / 2 - popover.height / 2,
    POPOVER_MARGIN,
    maxTop,
  );

  const side = sideOrder(preferred).find((s) => fits(s, target, popover, viewport));
  switch (side) {
    case 'bottom':
      return {
        mode: 'anchored',
        side,
        top: target.top + target.height + POPOVER_GAP,
        left: alignedLeft,
      };
    case 'top':
      return {
        mode: 'anchored',
        side,
        top: target.top - POPOVER_GAP - popover.height,
        left: alignedLeft,
      };
    case 'right':
      return {
        mode: 'anchored',
        side,
        top: alignedTop,
        left: target.left + target.width + POPOVER_GAP,
      };
    case 'left':
      return {
        mode: 'anchored',
        side,
        top: alignedTop,
        left: target.left - POPOVER_GAP - popover.width,
      };
    default:
      // No side has room (target taller or wider than the screen): bottom of the viewport
      return {
        mode: 'anchored',
        side: 'bottom',
        top: clamp(maxTop, POPOVER_MARGIN, maxTop),
        left: alignedLeft,
      };
  }
}
