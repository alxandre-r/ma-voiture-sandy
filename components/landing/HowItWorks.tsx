'use client';

import { motion } from 'framer-motion';

const STEPS = [
  {
    title: 'Ajoutez votre véhicule',
    desc: 'Marque, modèle, énergie et kilométrage : votre garage est prêt.',
  },
  {
    title: 'Saisissez au fil de l’eau',
    desc: 'Un plein, une révision, une facture : quelques secondes, depuis votre téléphone.',
  },
  {
    title: 'Laissez-vous guider',
    desc: 'Rappels, statistiques et score de santé vous disent quoi faire, et quand.',
  },
];

/** Three-step explanation of how the app is used. */
export default function HowItWorks() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-custom-1 dark:text-custom-1-dark">
            Comment ça marche
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Trois étapes, et c’est tout
          </h2>
        </motion.div>

        <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
          {/* Connector line between the step numbers (desktop) */}
          <div
            aria-hidden
            className="absolute left-[16.66%] right-[16.66%] top-5 hidden h-px bg-gradient-to-r from-custom-1/40 via-custom-2/40 to-custom-1/40 md:block"
          />
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              className="relative text-center"
            >
              <span className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-custom-1 dark:border-gray-700 dark:bg-gray-800 dark:text-custom-1-dark">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                {step.desc}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
