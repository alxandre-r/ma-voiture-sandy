'use client';

/**
 * @file components/demo/DemoTourLayer.tsx
 * @description Tour UI of the demo, by tour status:
 * - welcome → welcome card;
 * - running → spotlight + popover;
 * - paused → resume pill;
 * - done → final card.
 */

import { MOBILE_BREAKPOINT } from '@/components/tour/placement';
import ResumePill from '@/components/tour/ResumePill';
import TourOverlay from '@/components/tour/TourOverlay';
import TourPopover from '@/components/tour/TourPopover';
import { useTour } from '@/components/tour/TourProvider';
import { useTargetRect, useViewport } from '@/components/tour/useTargetRect';
import { useDemo } from '@/contexts/DemoContext';
import { useUser } from '@/contexts/UserContext';
import { routePath } from '@/lib/demo/tour/reducer';
import { TOUR_ROUTE_LABELS } from '@/lib/demo/tour/steps';

import FinishCard from './FinishCard';
import WelcomeCard from './WelcomeCard';

import type { TourContextValue } from '@/components/tour/TourProvider';

export default function DemoTourLayer() {
  const tour = useTour();
  const demo = useDemo();
  const user = useUser();

  if (!tour?.status) return null;

  switch (tour.status) {
    case 'welcome':
      return (
        <WelcomeCard
          firstName={user.name.split(' ')[0] || user.name}
          onStart={() => tour.start()}
          onExplore={tour.stop}
        />
      );
    case 'running':
      return <RunningTour tour={tour} />;
    case 'paused':
      return (
        <ResumePill
          current={tour.stepIndex + 1}
          total={tour.steps.length}
          onResume={tour.resume}
          onStop={tour.stop}
        />
      );
    case 'done':
      return <FinishCard onSignup={() => demo?.exit({ signup: true })} onContinue={tour.stop} />;
    default:
      return null;
  }
}

function RunningTour({ tour }: { tour: TourContextValue }) {
  const viewport = useViewport();
  const step = tour.step;
  const target = useTargetRect(step?.target, {
    enabled: step !== null && !tour.isNavigating,
    mobile: viewport.width < MOBILE_BREAKPOINT,
  });

  if (!step) return null;

  const navigatingLabel = tour.isNavigating
    ? (TOUR_ROUTE_LABELS[routePath(step.route)] ?? 'la page suivante')
    : undefined;

  return (
    <>
      {!tour.isNavigating && <TourOverlay rect={target.rect} interactive={step.interactive} />}
      <TourPopover
        steps={tour.steps}
        chapters={tour.chapters}
        stepIndex={tour.stepIndex}
        targetRect={target.rect}
        navigatingLabel={navigatingLabel}
        onNext={tour.next}
        onPrev={tour.prev}
        onSkipChapter={tour.skipChapter}
        onGoToChapter={tour.goToChapter}
        onClose={tour.stop}
      />
    </>
  );
}
