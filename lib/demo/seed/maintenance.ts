import { DEMO_DAUGHTER_ID, DEMO_PARTNER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '../constants';
import { addDays, addMonths, toTimestamp } from '../dates';

import { dateAtOdometer, odometerAt } from './energy';

import type { DemoExpense, DemoMaintenanceType } from '../types';
import type { FleetSeed } from './fleet';

/** Same ids/labels as types/maintenance.ts; intervals chosen so suggestions stay relevant. */
export const DEMO_MAINTENANCE_TYPES: Record<string, DemoMaintenanceType> = {
  oil_change: { label_fr: 'Vidange', interval_km: 15_000, interval_months: null },
  tires: { label_fr: 'Pneumatiques', interval_km: 40_000, interval_months: null },
  brakes: { label_fr: 'Freins', interval_km: 30_000, interval_months: null },
  inspection: { label_fr: 'Contrôle technique', interval_km: null, interval_months: 24 },
  repair: { label_fr: 'Réparation', interval_km: null, interval_months: null },
  battery: { label_fr: 'Batterie', interval_km: null, interval_months: null },
  wipers: { label_fr: 'Essuie-glaces', interval_km: null, interval_months: null },
  alignment: { label_fr: 'Alignement', interval_km: null, interval_months: null },
  transmission: { label_fr: 'Transmission', interval_km: null, interval_months: null },
  revision: { label_fr: 'Révision', interval_km: null, interval_months: 12 },
  other: { label_fr: 'Autre', interval_km: null, interval_months: null },
};

interface MaintenanceSpec {
  vehicleId: number;
  owner: string;
  typeId: string;
  date: string;
  amount: number;
  garage: string | null;
  notes: string | null;
  /** Explicit odometer; otherwise interpolated from the vehicle's fills */
  odometer?: number;
}

export function seedMaintenance(today: string, fleet: FleetSeed): DemoExpense[] {
  const energyOf = (vehicleId: number) => fleet.energy.filter((e) => e.vehicle_id === vehicleId);
  const p308 = DEMO_VEHICLE.peugeot308;
  const odometer308 = fleet.vehicles.find((v) => v.id === p308)?.odometer ?? 0;
  // Oil change 13 800 km ago -> the km-based reminder is due in 1 200 km
  const oilOdometer = odometer308 - 13_800;

  const specs: MaintenanceSpec[] = [
    // Peugeot 308 SW (Camille)
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'inspection',
      date: addDays(addMonths(today, -24), 12),
      amount: 78,
      garage: 'Contrôle Technique Lyon Est',
      notes: 'Aucun défaut, prochain contrôle dans 2 ans',
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'tires',
      date: addMonths(today, -20),
      amount: 412,
      garage: 'Pneus Express',
      notes: '4 pneus été',
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'alignment',
      date: addDays(addMonths(today, -20), 1),
      amount: 69,
      garage: 'Pneus Express',
      notes: null,
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'wipers',
      date: addMonths(today, -14),
      amount: 28,
      garage: null,
      notes: 'Balais avant',
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'revision',
      date: addDays(addMonths(today, -12), -15),
      amount: 289,
      garage: 'Garage du Centre',
      notes: 'Révision constructeur et filtre habitacle',
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'oil_change',
      date: dateAtOdometer(energyOf(p308), oilOdometer, 58),
      amount: 89,
      garage: 'Garage du Centre',
      notes: 'Huile 5W30 et filtre',
      odometer: oilOdometer,
    },
    {
      vehicleId: p308,
      owner: DEMO_USER_ID,
      typeId: 'brakes',
      date: addMonths(today, -7),
      amount: 245,
      garage: 'Garage du Centre',
      notes: 'Plaquettes avant',
    },
    // Renault Zoé (Camille)
    {
      vehicleId: DEMO_VEHICLE.zoe,
      owner: DEMO_USER_ID,
      typeId: 'tires',
      date: addMonths(today, -15),
      amount: 360,
      garage: 'Pneus Express',
      notes: null,
    },
    {
      vehicleId: DEMO_VEHICLE.zoe,
      owner: DEMO_USER_ID,
      typeId: 'inspection',
      date: addMonths(today, -13),
      amount: 72,
      garage: 'Contrôle Technique Lyon Est',
      notes: 'Premier contrôle technique',
    },
    {
      vehicleId: DEMO_VEHICLE.zoe,
      owner: DEMO_USER_ID,
      typeId: 'battery',
      date: addMonths(today, -9),
      amount: 119,
      garage: 'Garage du Centre',
      notes: 'Batterie 12 V',
    },
    {
      vehicleId: DEMO_VEHICLE.zoe,
      owner: DEMO_USER_ID,
      typeId: 'revision',
      date: addMonths(today, -5),
      amount: 149,
      garage: 'Renault Villeurbanne',
      notes: 'Entretien véhicule électrique',
    },
    {
      vehicleId: DEMO_VEHICLE.zoe,
      owner: DEMO_USER_ID,
      typeId: 'wipers',
      date: addDays(today, -25),
      amount: 32,
      garage: null,
      notes: 'Balais avant et arrière',
    },
    // Kia Niro (Thomas)
    {
      vehicleId: DEMO_VEHICLE.niro,
      owner: DEMO_PARTNER_ID,
      typeId: 'tires',
      date: addMonths(today, -16),
      amount: 380,
      garage: 'Pneus Express',
      notes: null,
    },
    {
      vehicleId: DEMO_VEHICLE.niro,
      owner: DEMO_PARTNER_ID,
      typeId: 'inspection',
      date: addMonths(today, -10),
      amount: 74,
      garage: 'Contrôle Technique Lyon Est',
      notes: null,
    },
    {
      vehicleId: DEMO_VEHICLE.niro,
      owner: DEMO_PARTNER_ID,
      typeId: 'revision',
      date: addDays(addMonths(today, -12), 55),
      amount: 210,
      garage: 'Kia Lyon Sud',
      notes: null,
    },
    // Peugeot 208 (Léa)
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      owner: DEMO_DAUGHTER_ID,
      typeId: 'oil_change',
      date: addMonths(today, -14),
      amount: 79,
      garage: 'Auto Service Bron',
      notes: null,
    },
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      owner: DEMO_DAUGHTER_ID,
      typeId: 'brakes',
      date: addMonths(today, -11),
      amount: 210,
      garage: 'Auto Service Bron',
      notes: 'Disques et plaquettes avant',
    },
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      owner: DEMO_DAUGHTER_ID,
      typeId: 'inspection',
      date: addMonths(today, -8),
      amount: 69,
      garage: 'Contrôle Technique Lyon Est',
      notes: null,
    },
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      owner: DEMO_DAUGHTER_ID,
      typeId: 'repair',
      date: addMonths(today, -6),
      amount: 95,
      garage: 'Auto Service Bron',
      notes: 'Rétroviseur droit',
    },
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      owner: DEMO_DAUGHTER_ID,
      typeId: 'battery',
      date: addMonths(today, -2),
      amount: 139,
      garage: 'Auto Service Bron',
      notes: 'Batterie remplacée',
    },
  ];

  return specs.map((spec, i) => ({
    id: 60_000 + i,
    vehicle_id: spec.vehicleId,
    owner_id: spec.owner,
    type: 'maintenance',
    amount: spec.amount,
    date: spec.date,
    notes: spec.notes,
    created_at: toTimestamp(spec.date, '11:00:00'),
    maintenance: {
      maintenance_type_id: spec.typeId,
      odometer:
        spec.odometer ??
        odometerAt(energyOf(spec.vehicleId), spec.date, fleet.kmPerDay[spec.vehicleId]),
      garage: spec.garage,
    },
  }));
}
