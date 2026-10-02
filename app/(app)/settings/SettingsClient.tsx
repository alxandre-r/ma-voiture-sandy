/**
 * @file src/app/settings/SettingsClient.tsx
 * @description Client component for the settings page. Displays the settings
 * navigation menu on the left and the active section content on the right.
 */

'use client';

import { useState } from 'react';

import { useUser } from '@/contexts/UserContext';

import AccountSection from './sections/Account';
import PreferencesSection from './sections/Appearance';
import LogoutSection from './sections/Logout';
import PatchnotesSection from './sections/Patchnotes';
import PrivacySection from './sections/Privacy';
import SettingsMenu from './SettingsMenu';

import type { User } from '@/types/user';
import type { UserPreferences } from '@/types/userPreferences';

interface SettingsClientProps {
  initialPreferences: UserPreferences | null;
}

export default function SettingsClient({ initialPreferences }: SettingsClientProps) {
  const user: User = useUser();
  const [activeSection, setActiveSection] = useState('account');

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floating menu */}
        <aside className="lg:col-span-1">
          <SettingsMenu activeSection={activeSection} onChange={setActiveSection} />
        </aside>

        {/* Active section content */}
        <div data-tour="settings-panel" className="lg:col-span-3">
          {activeSection === 'account' && <AccountSection user={user} />}
          {activeSection === 'preferences' && (
            <PreferencesSection initialPreferences={initialPreferences} />
          )}
          {activeSection === 'patchnotes' && <PatchnotesSection />}
          {activeSection === 'privacy' && <PrivacySection />}
          {activeSection === 'logout' && <LogoutSection />}
        </div>
      </div>
    </main>
  );
}
