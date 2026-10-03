'use client';

import { motion } from 'framer-motion';

import { buttonClasses } from '@/components/common/ui/Button';
import Icon from '@/components/common/ui/Icon';
import DemoLink from '@/components/landing/DemoLink';

const SELLING_POINTS = [
  'Pleins et consommation réelle, essence comme électrique',
  'Entretiens, factures et rappels par date ou kilométrage',
  'Assurance, dépenses et statistiques au même endroit',
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6 },
});

/** Left column of the first screen: pitch, selling points and the demo entry. */
export default function LandingHero() {
  return (
    <div className="text-center lg:text-left">
      <motion.span
        {...fadeUp(0)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/60 px-3 py-1 text-xs font-medium text-gray-600 backdrop-blur dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300"
      >
        <Icon name="car" size={14} className="text-custom-1 dark:text-custom-1-dark" />
        Le carnet de bord de vos véhicules
      </motion.span>

      <motion.h1
        {...fadeUp(0.1)}
        className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white"
      >
        Ma voiture Sandy
      </motion.h1>

      <motion.p
        {...fadeUp(0.2)}
        className="mx-auto mt-5 max-w-xl text-lg text-gray-600 lg:mx-0 dark:text-gray-300"
      >
        Une solution simple, rapide et intuitive pour suivre et gérer vos véhicules, seul ou en
        famille.
      </motion.p>

      <motion.ul
        {...fadeUp(0.3)}
        className="mx-auto mt-8 inline-flex max-w-xl flex-col gap-3 text-left lg:mx-0"
      >
        {SELLING_POINTS.map((point) => (
          <li key={point} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-custom-1/10 text-custom-1 dark:bg-custom-1-dark/15 dark:text-custom-1-dark">
              <Icon name="check" size={14} />
            </span>
            <span className="text-sm sm:text-base">{point}</span>
          </li>
        ))}
      </motion.ul>

      <motion.div {...fadeUp(0.4)} className="mt-8 flex flex-col items-center gap-2 lg:items-start">
        <DemoLink
          className={buttonClasses(
            'outline',
            'lg',
            'bg-white/70 backdrop-blur dark:bg-gray-800/60 dark:hover:bg-gray-800',
          )}
        >
          <Icon name="dashboard" size={18} />
          Essayer la démo, sans inscription
        </DemoLink>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Données fictives · visite guidée de 3 minutes
        </span>
      </motion.div>
    </div>
  );
}
