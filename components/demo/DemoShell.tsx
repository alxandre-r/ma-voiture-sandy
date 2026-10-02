'use client';

/**
 * @file components/demo/DemoShell.tsx
 * @description Client root of the demo, mounted by AppDataProvider in demo mode only. It
 * holds the demo controls (DemoProvider), the guided tour engine (TourProvider) and the tour
 * UI. It lives in the (app) layout, so the tour survives page navigations.
 */

import { TourProvider } from '@/components/tour/TourProvider';
import { DemoProvider } from '@/contexts/DemoContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { TOUR_STORAGE_KEY } from '@/lib/demo/client';
import { TOUR_CHAPTERS, TOUR_RELAUNCH_HINT, TOUR_STEPS } from '@/lib/demo/tour/steps';

import DemoTourLayer from './DemoTourLayer';

import type { ReactNode } from 'react';

interface DemoShellProps {
  sessionId: string;
  children: ReactNode;
}

export default function DemoShell({ sessionId, children }: DemoShellProps) {
  return (
    <DemoProvider sessionId={sessionId}>
      <DemoTour sessionId={sessionId}>{children}</DemoTour>
    </DemoProvider>
  );
}

function DemoTour({ sessionId, children }: DemoShellProps) {
  const { showInfo } = useNotifications();
  return (
    <TourProvider
      steps={TOUR_STEPS}
      chapters={TOUR_CHAPTERS}
      sessionId={sessionId}
      storageKey={TOUR_STORAGE_KEY}
      onStop={() => showInfo(TOUR_RELAUNCH_HINT)}
    >
      {children}
      <DemoTourLayer />
    </TourProvider>
  );
}
