import { describe, expect, it } from 'vitest';

import { computePopoverPosition } from '@/components/tour/placement';

const viewport = { width: 1280, height: 800 };
const popover = { width: 360, height: 200 };

describe('computePopoverPosition', () => {
  it('places the popover below the target when there is room', () => {
    const target = { top: 100, left: 100, width: 200, height: 50 };
    expect(computePopoverPosition({ target, popover, viewport })).toEqual({
      mode: 'anchored',
      side: 'bottom',
      top: 162,
      left: 20,
    });
  });

  it('flips above the target when the space below is missing', () => {
    const target = { top: 650, left: 500, width: 200, height: 50 };
    expect(computePopoverPosition({ target, popover, viewport })).toEqual({
      mode: 'anchored',
      side: 'top',
      top: 438,
      left: 420,
    });
  });

  it('honours a preferred side', () => {
    const target = { top: 300, left: 900, width: 200, height: 40 };
    expect(computePopoverPosition({ target, popover, viewport, preferred: 'left' })).toEqual({
      mode: 'anchored',
      side: 'left',
      top: 220,
      left: 528,
    });
  });

  it('falls back to the opposite of the preferred side', () => {
    const target = { top: 300, left: 100, width: 200, height: 40 };
    expect(computePopoverPosition({ target, popover, viewport, preferred: 'left' })).toEqual({
      mode: 'anchored',
      side: 'right',
      top: 220,
      left: 312,
    });
  });

  it('keeps the popover inside the viewport horizontally', () => {
    const target = { top: 100, left: 1200, width: 60, height: 40 };
    const position = computePopoverPosition({ target, popover, viewport });
    expect(position).toEqual({ mode: 'anchored', side: 'bottom', top: 152, left: 904 });
  });

  it('stays inside the viewport when no side has room (huge target)', () => {
    const target = { top: -50, left: 0, width: 1280, height: 1000 };
    expect(computePopoverPosition({ target, popover, viewport })).toEqual({
      mode: 'anchored',
      side: 'bottom',
      top: 584,
      left: 460,
    });
  });

  it('centers the popover when there is no target', () => {
    expect(computePopoverPosition({ target: null, popover, viewport })).toEqual({
      mode: 'center',
      top: 300,
      left: 460,
    });
  });

  it('becomes a bottom sheet under 640 px, with or without target', () => {
    const mobile = { width: 390, height: 844 };
    const target = { top: 100, left: 10, width: 100, height: 40 };
    expect(computePopoverPosition({ target, popover, viewport: mobile })).toEqual({
      mode: 'sheet',
    });
    expect(computePopoverPosition({ target: null, popover, viewport: mobile })).toEqual({
      mode: 'sheet',
    });
  });
});
