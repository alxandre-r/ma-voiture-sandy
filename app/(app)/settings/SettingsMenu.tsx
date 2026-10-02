/**
 * @file src/app/settings/SettingsMenu.tsx
 * @description Floating menu for settings page. Displays a list of sections and highlights the active one. Pass the selected section to layout to display the corresponding content.
 */

'use client';

import Icon from '@/components/common/ui/Icon';

const menuItems: {
  id: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
}[] = [
  { id: 'account', label: 'Mon compte', icon: 'user' },
  { id: 'preferences', label: 'Préférences', icon: 'settings' },
  { id: 'patchnotes', label: 'Notes de version', icon: 'notes' },
  { id: 'privacy', label: 'Confidentialité', icon: 'secure' },
  { id: 'logout', label: 'Déconnexion', icon: 'garage' },
];

export default function SettingsMenu({
  activeSection,
  onChange,
}: {
  activeSection: string;
  onChange: (section: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-6">
      <nav className="grid grid-cols-2 md:flex md:flex-col gap-2 md:gap-0 md:space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            data-tour={item.id === 'preferences' ? 'settings-preferences' : undefined}
            onClick={() => onChange(item.id)}
            className={`w-full flex flex-row items-center gap-3 p-3 rounded-lg transition-colors hover:cursor-pointer
        ${
          activeSection === item.id
            ? 'bg-custom-1 text-white scale-105'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-98 transition-colors'
        }`}
          >
            <Icon name={item.icon} size={18} />
            <span className="font-medium text-sm md:text-base">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
