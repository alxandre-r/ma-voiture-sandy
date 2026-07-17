// Maintenance expense types from the database schema
// These match the maintenance_types table in public.maintenance_types

export type MaintenanceType =
  | 'oil_change' // Vidange
  | 'tires' // Pneumatiques
  | 'brakes' // Freins
  | 'inspection' // Contrôle technique
  | 'repair' // Réparation
  | 'battery' // Batterie
  | 'wipers' // Essuie-glaces
  | 'alignment' // Alignement
  | 'transmission' // Transmission
  | 'revision' // Révision
  | 'other'; // Autre

export interface MaintenanceTypeOption {
  value: MaintenanceType;
  label: string;
  icon: string;
  description: string;
}

export const MAINTENANCE_TYPES: MaintenanceTypeOption[] = [
  {
    value: 'oil_change',
    label: 'Vidange',
    icon: 'oil',
    description: "Changement d'huile moteur",
  },
  {
    value: 'tires',
    label: 'Pneumatiques',
    icon: 'tire',
    description: 'Changement de pneus',
  },
  {
    value: 'brakes',
    label: 'Freins',
    icon: 'brake',
    description: 'Freins et plaquettes',
  },
  {
    value: 'inspection',
    label: 'Contrôle technique',
    icon: 'secure',
    description: 'Contrôle technique obligatoire',
  },
  {
    value: 'repair',
    label: 'Réparation',
    icon: 'tool',
    description: 'Réparations',
  },
  {
    value: 'battery',
    label: 'Batterie',
    icon: 'battery',
    description: 'Batterie du véhicule',
  },
  {
    value: 'wipers',
    label: 'Essuie-glaces',
    icon: 'wiper',
    description: 'Essuie-glaces',
  },
  {
    value: 'alignment',
    label: 'Alignement',
    icon: 'alignment',
    description: 'Alignement des roues',
  },
  {
    value: 'transmission',
    label: 'Transmission',
    icon: 'transmission',
    description: 'Transmission',
  },
  {
    value: 'revision',
    label: 'Révision',
    icon: 'tool',
    description: 'Révision',
  },
  {
    value: 'other',
    label: 'Autre',
    icon: 'more-vertical',
    description: "Autre type d'entretien",
  },
];

