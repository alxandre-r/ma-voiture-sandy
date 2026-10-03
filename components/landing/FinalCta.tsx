'use client';

import { motion } from 'framer-motion';

import Button, { buttonClasses } from '@/components/common/ui/Button';
import { Card } from '@/components/common/ui/card';
import DemoLink from '@/components/landing/DemoLink';

interface FinalCtaProps {
  onCreateAccount: () => void;
}

/** Closing call to action: try the demo or go back up to sign up. */
export default function FinalCta({ onCreateAccount }: FinalCtaProps) {
  return (
    <section className="px-4 pb-20 pt-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl"
      >
        <Card className="relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-custom-1/25 via-custom-2/20 to-custom-1/25 blur-3xl"
          />
          <h2 className="relative text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            Envie de voir par vous-même ?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-gray-600 dark:text-gray-400">
            Explorez un garage déjà rempli avec la démo guidée, ou créez votre compte et ajoutez
            votre premier véhicule.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={onCreateAccount}>
              Créer un compte
            </Button>
            <DemoLink className={buttonClasses('outline', 'lg')}>Essayer la démo</DemoLink>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
