'use client';

import { useEffect, useState } from 'react';

import GlobalSearch from '@/components/common/GlobalSearch';
import PeriodSelector from '@/components/common/PeriodSelector';
import VehicleSelector from '@/components/common/VehicleSelector';
import Header from '@/components/Header';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useSelectors } from '@/contexts/SelectorsContext';

import Sidebar, { MobileSidebarDrawer } from './Sidebar';

import type { ReactNode } from 'react';

interface PrivateLayoutContentProps {
  children: ReactNode;
  title?: string; // titre de page
  showFilters?: boolean; // afficher filtres globaux
}

/**
 * Layout client unique - consumes SelectorsProvider from root layout.
 * Does NOT wrap with SelectorsProvider to avoid duplicate context.
 */
export default function PrivateLayoutContent({
  children,
  title = 'Page',
  showFilters = false,
}: PrivateLayoutContentProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K — open global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <NotificationProvider>
      <div className="relative flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        {/* Desktop sidebar */}
        <aside className="hidden md:flex">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        <MobileSidebarDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <div className="flex flex-1 flex-col min-w-0">
          <Header
            title={title}
            onMenuOpen={() => setMobileMenuOpen(true)}
            onSearchOpen={() => setSearchOpen(true)}
            content={
              showFilters && (
                <div className="flex flex-row gap-2 sm:gap-4 w-full sm:w-auto min-w-0">
                  <VehicleSelectorWrapper />
                  <PeriodSelectorWrapper />
                </div>
              )
            }
          />

          <main className="flex-1 px-2 py-3 pt-4 pb-[140px] sm:px-4 lg:px-6">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}

/* ---------------- Hooks wrappers ---------------- */
function VehicleSelectorWrapper() {
  const { selectedVehicleIds, setSelectedVehicleIds } = useSelectors();
  return <VehicleSelector value={selectedVehicleIds} onChange={setSelectedVehicleIds} />;
}

function PeriodSelectorWrapper() {
  const { selectedPeriod, setSelectedPeriod } = useSelectors();
  return <PeriodSelector selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />;
}
