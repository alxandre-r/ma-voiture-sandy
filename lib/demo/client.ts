/**
 * @file lib/demo/client.ts
 * @description Browser helpers of the demo (no server-only imports).
 */

/** localStorage key holding the guided tour progress */
export const TOUR_STORAGE_KEY = 'mv-demo-tour';

/** Channel on which tabs announce their mode: the demo cookie is shared by every tab. */
export const DEMO_MODE_CHANNEL = 'mv-demo-mode';

export interface DemoModeMessage {
  isDemo: boolean;
  /** Sender tab: a tab never reacts to its own announcements */
  tabId: string;
}

/** Identifies this tab (one module instance per tab). */
export const DEMO_TAB_ID = Math.random().toString(36).slice(2);

/** Tells the other tabs which mode this tab is in, so the ones in the other mode reload. */
export function announceDemoMode(isDemo: boolean): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(DEMO_MODE_CHANNEL);
  channel.postMessage({ isDemo, tabId: DEMO_TAB_ID } satisfies DemoModeMessage);
  channel.close();
}

/** Leaves the demo sandbox (removes the demo cookie). Never throws. */
export async function exitDemoSession(): Promise<void> {
  try {
    await fetch('/api/demo/exit', { method: 'POST' });
  } catch {
    // Offline: the cookie stays and the next visit simply resumes the demo
  }
  // Demo tabs left open elsewhere must not keep sending demo ids to the real routes
  announceDemoMode(false);
}

export function clearTourStorage(): void {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): nothing to clear
  }
}
