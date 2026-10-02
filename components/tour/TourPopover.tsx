'use client';

/**
 * @file components/tour/TourPopover.tsx
 * @description Tour bubble (portal, z-80): chapter, step count, title, text, chapter progress
 * and controls. Anchored next to the target, centered without target, bottom sheet under
 * 640 px. Takes the focus on every step and announces it in an aria-live region.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { computePopoverPosition, POPOVER_MARGIN, POPOVER_WIDTH } from './placement';
import { useViewport } from './useTargetRect';

import type { Rect } from './placement';
import type { TourChapter, TourStep } from '@/lib/demo/tour/types';

/** Height used before the first measure */
const FALLBACK_HEIGHT = 240;

interface TourPopoverProps {
  steps: readonly TourStep[];
  chapters: readonly TourChapter[];
  stepIndex: number;
  targetRect: Rect | null;
  /** Set while the tour opens the step's page: « Direction <label>… » */
  navigatingLabel?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkipChapter: () => void;
  onGoToChapter: (chapter: string) => void;
  onClose: () => void;
}

export default function TourPopover({
  steps,
  chapters,
  stepIndex,
  targetRect,
  navigatingLabel,
  onNext,
  onPrev,
  onSkipChapter,
  onGoToChapter,
  onClose,
}: TourPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const viewport = useViewport();
  const [size, setSize] = useState({ width: POPOVER_WIDTH, height: FALLBACK_HEIGHT });

  const step = steps[stepIndex];
  const chapter = chapters.find((c) => c.id === step.chapter);
  const isLast = stepIndex === steps.length - 1;
  const titleId = `tour-step-title-${step.id}`;

  // Measure the rendered bubble (content changes with every step)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately runs after every render: the content changes with each step
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const width = el.offsetWidth || POPOVER_WIDTH;
    const height = el.offsetHeight || FALLBACK_HEIGHT;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  });

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [step.id, navigatingLabel]);

  const position = computePopoverPosition({
    target: navigatingLabel ? null : targetRect,
    popover: size,
    viewport,
    preferred: step.placement ?? 'auto',
  });
  const width = Math.min(POPOVER_WIDTH, viewport.width - POPOVER_MARGIN * 2);
  const style =
    position.mode === 'sheet' ? undefined : { top: position.top, left: position.left, width };
  const placement = position.mode === 'anchored' ? position.side : position.mode;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <motion.div
        key={navigatingLabel ? `${step.id}-navigating` : step.id}
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-placement={placement}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }
        }
        style={style}
        className={`fixed z-[80] bg-white text-gray-800 shadow-2xl outline-none ring-1 ring-black/5 dark:bg-gray-800 dark:text-gray-100 dark:ring-white/10 ${
          position.mode === 'sheet'
            ? 'inset-x-0 bottom-0 max-h-[45vh] overflow-y-auto rounded-t-2xl p-4 pb-6'
            : 'rounded-2xl p-4 transition-[top,left] duration-300 motion-reduce:transition-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{chapter ? `${chapter.emoji} ${chapter.label}` : ''}</span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="tabular-nums">{`${stepIndex + 1}/${steps.length}`}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Quitter la visite"
              className="cursor-pointer rounded-md px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {navigatingLabel ? (
          <p id={titleId} className="mt-3 flex items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-custom-1 border-t-transparent motion-reduce:animate-none"
            />
            {`Direction ${navigatingLabel}…`}
          </p>
        ) : (
          <>
            <h2 id={titleId} className="mt-2 text-base font-bold text-gray-900 dark:text-gray-100">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.body}</p>

            <div role="group" aria-label="Progression par chapitre" className="mt-3 flex gap-1">
              {chapters.map((c) => {
                const indexes = steps.flatMap((s, i) => (s.chapter === c.id ? [i] : []));
                if (indexes.length === 0) return null;
                const seen = indexes.filter((i) => i <= stepIndex).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onGoToChapter(c.id)}
                    aria-label={`Aller au chapitre ${c.label}`}
                    title={c.label}
                    style={{ flexGrow: indexes.length }}
                    className="flex h-4 basis-0 cursor-pointer items-center"
                  >
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <span
                        className="block h-full rounded-full bg-custom-1"
                        style={{ width: `${(seen / indexes.length) * 100}%` }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onSkipChapter}
                className="cursor-pointer text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
              >
                Passer ce chapitre
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={stepIndex === 0}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="cursor-pointer rounded-lg bg-custom-1 px-3 py-1.5 text-sm font-semibold text-white hover:bg-custom-1-hover"
                >
                  {isLast ? 'Terminer' : 'Suivant →'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      <p aria-live="polite" className="sr-only">
        {navigatingLabel
          ? `Direction ${navigatingLabel}`
          : `Étape ${stepIndex + 1} sur ${steps.length} : ${step.title}`}
      </p>
    </>,
    document.body,
  );
}
