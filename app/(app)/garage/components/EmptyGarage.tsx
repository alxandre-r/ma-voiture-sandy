'use client';

import Button from '@/components/common/ui/Button';
import Icon from '@/components/common/ui/Icon';

interface EmptyGarageProps {
  onAddVehicle: () => void;
}

const STEPS = [
  {
    number: '1',
    icon: 'car',
    label: 'Ajoutez votre véhicule',
    description: 'Marque, modèle, kilométrage — tout en quelques secondes.',
    active: true,
  },
  {
    number: '2',
    icon: 'euro',
    label: 'Enregistrez vos dépenses',
    description: 'Carburant, entretien, assurance — centralisés au même endroit.',
    active: false,
  },
  {
    number: '3',
    icon: 'chart',
    label: 'Suivez vos statistiques',
    description: 'Consommation, coût au km, comparaisons — visualisez tout.',
    active: false,
  },
] as const;

export default function EmptyGarage({ onAddVehicle }: EmptyGarageProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 bg-custom-1/10 rounded-full flex items-center justify-center mb-6">
        <Icon name="car" size={40} className="text-custom-1" />
      </div>

      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Bienvenue dans votre garage
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm">
        Commencez par ajouter votre premier véhicule pour débloquer toutes les fonctionnalités.
      </p>

      {/* Étapes onboarding */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10 w-full max-w-xl">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className={`flex-1 flex flex-col items-center gap-2 px-4 py-5 rounded-xl border transition-colors ${
              step.active
                ? 'border-custom-1/30 bg-custom-1/5 dark:bg-custom-1/10'
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.active
                  ? 'bg-custom-1 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            <p
              className={`text-sm font-semibold ${step.active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {step.label}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        leftIcon={<Icon name="add" size={20} />}
        onClick={onAddVehicle}
      >
        Ajouter mon premier véhicule
      </Button>
    </div>
  );
}
