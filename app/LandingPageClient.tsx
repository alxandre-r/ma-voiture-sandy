/**
 * @file src/app/page.tsx
 * @fileoverview Landing page with animations using Framer Motion and custom icons.
 */

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import SignInForm from '@/components/auth/forms/SignInForm';
import SignUpForm from '@/components/auth/forms/SignUpForm';

// UI Effects
import Aurora from '../components/common/ui/effects/AuroraBackground';
import ShinyText from '../components/common/ui/effects/ShinyText';

const REASON_MESSAGES: Record<string, string> = {
  session_expired: 'Votre session a expiré. Veuillez vous reconnecter.',
};

export default function LandingPage() {
  const searchParams = useSearchParams();
  const [formType, setFormType] = useState<'signin' | 'signup'>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );
  const reason = searchParams.get('reason');
  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Check if user has a theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      // Fall back to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative">
      <Aurora
        colorStops={['#F54927', '#47BFFF', '#5227FF']}
        blend={0.5}
        amplitude={1}
        speed={0.5}
        theme={theme}
      />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center pb-10 px-6 ">
        <motion.h1
          className="text-4xl sm:text-6xl font-bold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Ma voiture Sandy
        </motion.h1>

        <motion.p
          className="max-w-xl text-gray-600 dark:text-gray-300 text-lg mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Une solution simple, rapide et intuitive pour suivre et gérer vos véhicules.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
        >
          {/* Plain <a>: /demo sets a cookie, it must never be prefetched by next/link */}
          <a
            href="/demo"
            className="inline-flex items-center gap-2 rounded-xl bg-custom-2 px-6 py-3 font-semibold text-white shadow-lg shadow-custom-2/30 transition-colors hover:bg-custom-2-hover"
          >
            Essayer la démo, sans inscription
          </a>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Données fictives · visite guidée de 3 minutes
          </span>
        </motion.div>
      </section>

      {/* Session-expired / auth error banner */}
      {reasonMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex justify-center px-6 mb-2"
        >
          <div
            className="w-full max-w-md flex items-center gap-3 px-4 py-3 rounded-xl
            bg-amber-50 dark:bg-amber-900/30
            border border-amber-200 dark:border-amber-700
            text-amber-800 dark:text-amber-300 text-sm"
          >
            <span>{reasonMessage}</span>
          </div>
        </motion.div>
      )}

      {/* Form Section - Always visible */}
      <section className="w-full flex justify-center px-6 pb-10">
        <div className="w-full max-w-md">
          {formType === 'signin' && (
            <div className="space-y-4">
              <SignInForm />
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <span>Pas encore de compte ? </span>
                <button
                  onClick={() => setFormType('signup')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium hover:cursor-pointer"
                >
                  Créez-en un !
                </button>
              </div>
            </div>
          )}

          {formType === 'signup' && (
            <div className="space-y-4">
              <SignUpForm />
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <span>Déjà un compte ? </span>
                <button
                  onClick={() => setFormType('signin')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium hover:cursor-pointer"
                >
                  Connectez-vous !
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {[
            {
              icon: '/icons/dashboard.svg',
              title: 'Tableau de bord clair',
              desc: 'Visualisez toutes vos données au même endroit.',
            },
            {
              icon: '/icons/secure.svg',
              title: 'Sécurité des données',
              desc: 'Vos informations sont protégées et cryptées.',
            },
            {
              icon: '/icons/responsive.svg',
              title: 'Responsive',
              desc: 'Utilisable sur PC, tablette et mobile.',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-4 dark:invert">
                <Image src={feature.icon} alt={feature.title} width={64} height={64} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <ShinyText
                text={feature.desc}
                speed={5}
                delay={0}
                color="#b5b5b5"
                shineColor="#ffffff"
                spread={120}
                direction="left"
                yoyo={false}
                pauseOnHover={false}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-auto">
        <p className="text-sm">
          © {new Date().getFullYear()} ma-voiture-sandy. Tous droits réservés.
        </p>
      </footer>
    </main>
  );
}
