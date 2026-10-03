/**
 * @file app/LandingPageClient.tsx
 * @fileoverview Public landing page: pitch + auth card (sign in / sign up) on the first screen,
 * product presentation when scrolling.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState } from 'react';

import Aurora from '@/components/common/ui/effects/AuroraBackground';
import AuthCard from '@/components/landing/AuthCard';
import FeatureGrid from '@/components/landing/FeatureGrid';
import FinalCta from '@/components/landing/FinalCta';
import HowItWorks from '@/components/landing/HowItWorks';
import LandingHero from '@/components/landing/LandingHero';

import type { AuthMode } from '@/components/landing/AuthCard';

// Module-level: Aurora re-inits WebGL whenever the colorStops array identity changes
const AURORA_COLORS = ['#F54927', '#47BFFF', '#5227FF'];

const REASON_MESSAGES: Record<string, string> = {
  session_expired: 'Votre session a expiré. Veuillez vous reconnecter.',
};

export default function LandingPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );
  const reason = searchParams.get('reason');
  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const { resolvedTheme } = useTheme();

  const goToSignUp = () => {
    setMode('signup');
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Aurora behind the first screen, faded out towards the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[85vh] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      >
        <Aurora
          colorStops={AURORA_COLORS}
          blend={0.5}
          amplitude={1}
          speed={0.5}
          theme={resolvedTheme === 'light' ? 'light' : 'dark'}
        />
      </div>

      {/* First screen: pitch + auth */}
      <section className="relative flex min-h-[100svh] flex-col px-4 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <LandingHero />
          <div className="mx-auto w-full max-w-md">
            <AuthCard mode={mode} onModeChange={setMode} notice={reasonMessage} />
          </div>
        </div>

        <a
          href="#decouvrir"
          className="mx-auto mb-6 flex flex-col items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Découvrir
          <span className="animate-bounce motion-reduce:animate-none" aria-hidden>
            ↓
          </span>
        </a>
      </section>

      <FeatureGrid />
      <HowItWorks />
      <FinalCta onCreateAccount={goToSignUp} />

      <footer className="mt-auto border-t border-gray-100 py-6 text-center text-sm text-gray-500 dark:border-gray-800">
        © {new Date().getFullYear()} ma-voiture-sandy. Tous droits réservés.
      </footer>
    </main>
  );
}
