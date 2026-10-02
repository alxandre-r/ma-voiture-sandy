'use client';

/**
 * @file components/tour/TourOverlay.tsx
 * @description Tour spotlight, rendered in a portal at z-45:
 * - a dark veil with a rounded cutout (SVG mask, no pointer events);
 * - four click blockers around the cutout;
 * - a pulsing halo in custom-1.
 * App menus, modals, drawers and toasts (z-50 to z-70) stay above it, and the popover sits
 * at z-80. Interactive steps only show the halo, so the whole page stays usable. This also
 * matters because the header is a z-30 stacking context: its dropdowns would open under a
 * veil.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';

import type { Rect } from './placement';
import type { CSSProperties } from 'react';

const PADDING = 8;
const RADIUS = 12;
const LAYER = 'fixed z-[45]';

interface TourOverlayProps {
  /** Target rectangle (viewport coordinates); null → no spotlight */
  rect: Rect | null;
  interactive?: boolean;
}

export default function TourOverlay({ rect, interactive = false }: TourOverlayProps) {
  const reduceMotion = useReducedMotion();
  if (typeof document === 'undefined') return null;

  const cut = rect
    ? {
        x: rect.left - PADDING,
        y: rect.top - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 30 };

  const blockers: CSSProperties[] = cut
    ? [
        { top: 0, left: 0, right: 0, height: Math.max(0, cut.y) },
        { top: cut.y + cut.height, left: 0, right: 0, bottom: 0 },
        { top: cut.y, left: 0, width: Math.max(0, cut.x), height: cut.height },
        { top: cut.y, left: cut.x + cut.width, right: 0, height: cut.height },
      ]
    : [{ inset: 0 }];

  return createPortal(
    <>
      {!interactive && (
        <>
          <svg
            data-testid="tour-veil"
            aria-hidden="true"
            className={`${LAYER} pointer-events-none inset-0 h-full w-full`}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {cut && (
                  <motion.rect
                    data-testid="tour-cutout"
                    initial={false}
                    animate={{ attrX: cut.x, attrY: cut.y, width: cut.width, height: cut.height }}
                    transition={transition}
                    rx={RADIUS}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(17, 24, 39, 0.6)"
              mask="url(#tour-spotlight-mask)"
            />
          </svg>
          {blockers.map((style, index) => (
            // Swallows clicks outside the cutout: the page stays visible but inert
            <div
              key={index}
              data-testid="tour-blocker"
              aria-hidden="true"
              className={LAYER}
              style={style}
              onClick={(event) => event.stopPropagation()}
            />
          ))}
        </>
      )}
      {cut && (
        <motion.div
          data-testid="tour-halo"
          aria-hidden="true"
          className={`${LAYER} pointer-events-none rounded-xl ring-2 ring-custom-1`}
          initial={false}
          animate={{ left: cut.x, top: cut.y, width: cut.width, height: cut.height }}
          transition={transition}
        >
          {!reduceMotion && (
            <motion.span
              className="absolute inset-0 rounded-xl ring-4 ring-custom-1/50"
              animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      )}
    </>,
    document.body,
  );
}
