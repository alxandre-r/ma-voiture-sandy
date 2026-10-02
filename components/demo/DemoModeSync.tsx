'use client';

/**
 * @file components/demo/DemoModeSync.tsx
 * @description Keeps every open tab in the same mode (demo or real app). The demo cookie is shared
 * by all tabs: a tab left in the other mode would send its mutations to the wrong backend, so it
 * reloads as soon as another tab announces a different mode. Renders nothing.
 */

import { useEffect } from 'react';

import { DEMO_MODE_CHANNEL, DEMO_TAB_ID } from '@/lib/demo/client';

import type { DemoModeMessage } from '@/lib/demo/client';

interface DemoModeSyncProps {
  isDemo: boolean;
}

export default function DemoModeSync({ isDemo }: DemoModeSyncProps) {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(DEMO_MODE_CHANNEL);
    const onMessage = (event: MessageEvent<DemoModeMessage>) => {
      const { data } = event;
      if (data?.tabId === DEMO_TAB_ID || typeof data?.isDemo !== 'boolean') return;
      if (data.isDemo !== isDemo) window.location.reload();
    };
    channel.addEventListener('message', onMessage);
    channel.postMessage({ isDemo, tabId: DEMO_TAB_ID } satisfies DemoModeMessage);
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
    };
  }, [isDemo]);

  return null;
}
