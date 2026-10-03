'use client';

import { motion } from 'framer-motion';

import { Card } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { cn } from '@/lib/utils/utils';

const FEATURES = [
  {
    icon: 'conso',
    title: 'Pleins & consommation',
    desc: 'Chaque plein ou recharge alimente votre consommation réelle et le coût au kilomètre.',
  },
  {
    icon: 'tool',
    title: 'Entretien',
    desc: 'Révisions et réparations datées, kilométrage relevé, factures jointes.',
  },
  {
    icon: 'bell',
    title: 'Rappels',
    desc: 'Par date ou par kilométrage, ponctuels ou récurrents. Un entretien saisi programme le suivant.',
  },
  {
    icon: 'secure',
    title: 'Assurance',
    desc: 'Vos contrats par véhicule, leurs échéances et tout leur historique.',
  },
  {
    icon: 'chart',
    title: 'Statistiques',
    desc: 'Dépenses par catégorie, par véhicule et par période, en graphiques lisibles.',
  },
  {
    icon: 'garage',
    title: 'Garage',
    desc: 'Tous vos véhicules et leur score de santé, en un coup d’œil.',
  },
];

const reveal = (index: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay: (index % 3) * 0.08, duration: 0.5 },
});

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg bg-custom-1/10 text-custom-1 dark:bg-custom-1-dark/15 dark:text-custom-1-dark',
        className,
      )}
    >
      <Icon name={name} size={20} />
    </span>
  );
}

/** "Tout votre véhicule" section: one card per area of the app. */
export default function FeatureGrid() {
  return (
    <section id="decouvrir" className="scroll-mt-6 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal(0)} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-custom-1 dark:text-custom-1-dark">
            Fonctionnalités
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Tout votre véhicule, au même endroit
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Fini les tickets de caisse dans la boîte à gants et le tableur oublié : chaque dépense
            trouve sa place, et les échéances viennent à vous.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div key={feature.title} {...reveal(index)}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md">
                <FeatureIcon name={feature.icon} />
                <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
              </Card>
            </motion.div>
          ))}

          <motion.div {...reveal(0)} className="sm:col-span-2 lg:col-span-3">
            <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <FeatureIcon
                name="family"
                className="bg-custom-2/10 text-custom-2 dark:bg-custom-2-dark/15 dark:text-custom-2-dark"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">En famille</h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Partagez vos véhicules avec vos proches : chacun saisit ses pleins et ses
                  dépenses, tout le monde voit le même historique.
                </p>
              </div>
              <span className="inline-flex items-center self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 sm:self-center dark:bg-gray-900/60 dark:text-gray-300">
                Données privées
              </span>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
