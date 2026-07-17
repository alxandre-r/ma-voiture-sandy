/**
 * @file AppDataProvider.tsx
 * @fileoverview Async Server Component that fetches user and vehicle data.
 * Wrapped in Suspense in layout for streaming.
 * This allows the layout shell to render immediately while data loads.
 *
 * Note: Family data is fetched directly in each page's Server Components
 * for proper granular streaming with Suspense boundaries.
 */
import { redirect } from 'next/navigation';

import { RemindersCountProvider } from '@/contexts/RemindersCountContext';
import { SelectorsProvider } from '@/contexts/SelectorsContext';
import { UserProvider } from '@/contexts/UserContext';
import { getUserFamilies } from '@/lib/data/family/getUserFamilies';
import { getOverdueCount } from '@/lib/data/reminders/getOverdueCount';
import { getCurrentUserInfo } from '@/lib/data/user/getCurrentUserInfo';
import { getUserPreferences } from '@/lib/data/user/getUserPreferences';
import { getAllVehiclesMinimal } from '@/lib/data/vehicles';

import type { ReactNode } from 'react';

interface AppDataProviderProps {
  children: ReactNode;
}

/**
 * Fetches user and vehicle data in PARALLEL.
 * This is wrapped in Suspense to enable streaming.
 */
export default async function AppDataProvider({ children }: AppDataProviderProps) {
  // Fetch user, vehicles, preferences and reminder counts in PARALLEL
  const [user, initialVehicles, preferences, families, reminderCounts] = await Promise.all([
    getCurrentUserInfo(),
    getAllVehiclesMinimal(),
    getUserPreferences(),
    getUserFamilies(),
    getOverdueCount(),
  ]);

  if (!user) {
    redirect('/?reason=session_expired');
  }

  // user is non-null after redirect above
  const safeUser = user!;

  return (
    <UserProvider user={safeUser}>
      <SelectorsProvider
        initialVehicles={initialVehicles}
        initialPreferences={preferences}
        initialFamilies={families}
        currentUserId={safeUser.id}
      >
        <RemindersCountProvider overdue={reminderCounts.overdue} dueSoon={reminderCounts.dueSoon}>
          {children}
        </RemindersCountProvider>
      </SelectorsProvider>
    </UserProvider>
  );
}
