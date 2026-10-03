'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';

import SignInForm from '@/components/auth/forms/SignInForm';
import SignUpForm from '@/components/auth/forms/SignUpForm';
import { Card } from '@/components/common/ui/card';
import DemoLink from '@/components/landing/DemoLink';
import { cn } from '@/lib/utils/utils';

export type AuthMode = 'signin' | 'signup';

const TABS: { mode: AuthMode; label: string }[] = [
  { mode: 'signin', label: 'Connexion' },
  { mode: 'signup', label: 'Inscription' },
];

const SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const;

// direction: 1 when moving to signup (right tab), -1 when moving back to signin
const slideVariants = {
  enter: (direction: number) => ({ x: `${direction * 35}%`, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: `${direction * -35}%`, opacity: 0 }),
};

/** Tracks the rendered height of an element, so the card can morph between forms. */
function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // offsetHeight (border box): contentRect would drop the wrapper's padding and clip the button
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

interface AuthCardProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  notice?: string | null;
}

export default function AuthCard({ mode, onModeChange, notice }: AuthCardProps) {
  const reduceMotion = useReducedMotion();
  const [contentRef, contentHeight] = useMeasuredHeight<HTMLDivElement>();
  const direction = mode === 'signup' ? 1 : -1;

  return (
    <Card
      id="auth"
      className="scroll-mt-6 overflow-hidden bg-white/85 shadow-xl shadow-gray-900/5 backdrop-blur-md dark:bg-gray-800/80 dark:shadow-black/30"
    >
      <div className="p-6 sm:p-8">
        {/* Segmented toggle */}
        <div
          role="tablist"
          aria-label="Connexion ou inscription"
          className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-900/60"
        >
          {TABS.map((tab) => {
            const selected = tab.mode === mode;
            return (
              <button
                key={tab.mode}
                type="button"
                role="tab"
                id={`auth-tab-${tab.mode}`}
                aria-selected={selected}
                aria-controls="auth-panel"
                onClick={() => onModeChange(tab.mode)}
                className={cn(
                  'relative cursor-pointer rounded-md py-2 text-sm font-medium transition-colors',
                  selected
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    transition={reduceMotion ? { duration: 0 } : SPRING}
                    className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-gray-700"
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
          {mode === 'signin'
            ? 'Bon retour ! Retrouvez vos véhicules là où vous les avez laissés.'
            : 'Gratuit, sans engagement. Il suffit d’une minute.'}
        </p>

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            {notice}
          </div>
        )}

        {/* Height morph: the wrapper animates to the measured height of the active form.
            -mx/px keep focus rings unclipped while the slide stays inside the card. */}
        <motion.div
          className="-mx-6 mt-5 overflow-hidden px-6 sm:-mx-8 sm:px-8"
          initial={false}
          animate={{ height: contentHeight }}
          transition={reduceMotion ? { duration: 0 } : SPRING}
        >
          <div ref={contentRef} className="relative py-1">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={mode}
                id="auth-panel"
                role="tabpanel"
                aria-labelledby={`auth-tab-${mode}`}
                custom={direction}
                variants={slideVariants}
                initial={reduceMotion ? false : 'enter'}
                animate="center"
                exit={reduceMotion ? undefined : 'exit'}
                transition={SPRING}
                className="w-full"
              >
                {mode === 'signin' ? <SignInForm /> : <SignUpForm />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 text-sm sm:px-8 dark:border-gray-700 dark:bg-gray-900/30">
        <span className="text-gray-500 dark:text-gray-400">Juste curieux ?</span>
        <DemoLink className="font-medium text-custom-1 hover:underline dark:text-custom-1-dark">
          Tester la démo →
        </DemoLink>
      </div>
    </Card>
  );
}
