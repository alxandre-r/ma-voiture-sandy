'use client';

import { useTheme } from 'next-themes';

import usePreferencesActions from '@/app/(app)/settings/hooks/usePreferencesActions';
import Icon from '@/components/common/ui/Icon';

import type { UserPreferences } from '@/types/userPreferences';

interface Props {
  initialPreferences: UserPreferences | null;
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-custom-1' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function PreferencesSection({ initialPreferences }: Props) {
  const { theme, setTheme } = useTheme();
  const { prefs, update } = usePreferencesActions(initialPreferences);

  return (
    <section className="space-y-6">
      {/* Thème */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Icon name="settings" size={24} />
          Préférences
        </h2>

        <label htmlFor="pref-theme" className="block mb-2 font-medium">
          Thème
        </label>
        <select
          id="pref-theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full lg:w-[360px] p-3 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
          <option value="system">Système</option>
        </select>
      </div>

      {/* Filtres par défaut */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Filtres par défaut
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Appliqués au démarrage si aucune sélection n&apos;est sauvegardée dans le navigateur.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="pref-period"
              className="block mb-2 font-medium text-gray-700 dark:text-gray-300"
            >
              Période
            </label>
            <select
              id="pref-period"
              value={prefs.default_period}
              onChange={(e) =>
                update({ default_period: e.target.value as UserPreferences['default_period'] })
              }
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
              <option value="all">Tout</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-vehicle-scope"
              className="block mb-2 font-medium text-gray-700 dark:text-gray-300"
            >
              Véhicules affichés
            </label>
            <select
              id="pref-vehicle-scope"
              value={prefs.default_vehicle_scope}
              onChange={(e) =>
                update({
                  default_vehicle_scope: e.target.value as UserPreferences['default_vehicle_scope'],
                })
              }
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="all">Tous</option>
              <option value="personal">Mes véhicules</option>
              <option value="family">Véhicules de la famille</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visibilité famille */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-100">
          Visibilité (famille)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choisissez ce que les membres de votre famille peuvent voir sur vos véhicules.
        </p>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Toggle
            label="Consommation"
            description="Afficher la consommation calculée et les données techniques"
            checked={prefs.show_consumption}
            onChange={(v) => update({ show_consumption: v })}
          />
          <Toggle
            label="Assurance"
            description="Afficher le contrat d'assurance actif"
            checked={prefs.show_insurance}
            onChange={(v) => update({ show_insurance: v })}
          />
          <Toggle
            label="Détails du véhicule"
            description="Afficher les informations générales (marque, modèle, VIN…)"
            checked={prefs.show_vehicle_details}
            onChange={(v) => update({ show_vehicle_details: v })}
          />
          <Toggle
            label="Données financières"
            description="Afficher le mode de financement et le prix d'achat"
            checked={prefs.show_financials}
            onChange={(v) => update({ show_financials: v })}
          />
        </div>
      </div>
    </section>
  );
}
