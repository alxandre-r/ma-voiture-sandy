/**
 * @file lib/demo/client.ts
 * @description Browser helpers of the demo (no server-only imports).
 */

/** localStorage key holding the guided tour progress */
export const TOUR_STORAGE_KEY = 'mv-demo-tour';

/** Leaves the demo sandbox (removes the demo cookie). Never throws. */
export async function exitDemoSession(): Promise<void> {
  try {
    await fetch('/api/demo/exit', { method: 'POST' });
  } catch {
    // Offline: the cookie stays and the next visit simply resumes the demo
  }
}

export function clearTourStorage(): void {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): nothing to clear
  }
}
