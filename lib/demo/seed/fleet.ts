import { DEMO_DAUGHTER_ID, DEMO_PARTNER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '../constants';
import { addDays, addMonths, daysBetween, toTimestamp } from '../dates';
import { round } from '../random';

import { generateEnergySeries, odometerAt } from './energy';

import type { Random } from '../random';
import type { DemoExpense, DemoVehicle } from '../types';

export interface FleetSeed {
  vehicles: DemoVehicle[];
  energy: DemoExpense[];
  /** Average daily mileage per vehicle id, used to interpolate odometers */
  kmPerDay: Record<number, number>;
}

/** Fuel price with a yearly seasonality (cheaper in winter) and a little noise. */
function seasonalPrice(base: number, amplitude: number, random: Random) {
  return (date: string) => {
    const dayOfYear = daysBetween(`${date.slice(0, 4)}-01-01`, date);
    return (
      base + amplitude * Math.sin((2 * Math.PI * dayOfYear) / 365) + random.between(-0.02, 0.02)
    );
  };
}

const lastOdometer = (entries: DemoExpense[]) => entries[entries.length - 1].fill?.odometer ?? 0;

export function seedFleet(today: string, random: Random): FleetSeed {
  const diesel = seasonalPrice(1.73, 0.08, random);
  const e10 = seasonalPrice(1.81, 0.08, random);

  const peugeot308 = generateEnergySeries(
    {
      vehicleId: DEMO_VEHICLE.peugeot308,
      firstId: 10_000,
      count: 60,
      intervalDays: 12,
      lastDaysAgo: 3,
      endOdometer: 92_400,
      kmPerDay: 58,
      kind: 'fuel',
      consumption: 5.9,
      price: diesel,
      ownerFor: () => DEMO_USER_ID,
      notesFor: (i) =>
        i === 59
          ? 'Beaucoup de trajets en ville ces derniers jours'
          : i % 9 === 4
            ? 'Autoroute, retour de week-end'
            : null,
      lastQuantityFactor: 1.3,
    },
    today,
    random,
  );

  const zoe = generateEnergySeries(
    {
      vehicleId: DEMO_VEHICLE.zoe,
      firstId: 20_000,
      count: 72,
      intervalDays: 10,
      lastDaysAgo: 1,
      endOdometer: 38_900,
      kmPerDay: 25,
      kind: 'charge',
      consumption: 15.5,
      price: (_date, i) => (i % 6 === 5 ? 0.49 : 0.2276),
      ownerFor: () => DEMO_USER_ID,
      notesFor: (i) => (i % 6 === 5 ? 'Borne rapide, aire de Mâcon' : 'Recharge à domicile'),
    },
    today,
    random,
  );

  const niroFuel = generateEnergySeries(
    {
      vehicleId: DEMO_VEHICLE.niro,
      firstId: 30_000,
      count: 34,
      intervalDays: 21,
      lastDaysAgo: 6,
      endOdometer: 54_000,
      kmPerDay: 40,
      kind: 'fuel',
      consumption: 4.4,
      price: e10,
      ownerFor: (i) => (i % 4 === 3 ? DEMO_USER_ID : DEMO_PARTNER_ID),
    },
    today,
    random,
  );

  // Plug-in hybrid: small home charges between fuel fills, odometer read on the fuel timeline
  const niroCharges = Array.from({ length: 34 }, (_, i): DemoExpense => {
    const date = addDays(today, -(16 + (33 - i) * 21));
    const kwh = round(random.between(7.8, 9.6), 2);
    return {
      id: 31_000 + i,
      vehicle_id: DEMO_VEHICLE.niro,
      owner_id: DEMO_PARTNER_ID,
      type: 'electric_charge',
      amount: round(kwh * 0.2276, 2),
      date,
      notes: 'Recharge à domicile',
      created_at: toTimestamp(date, '22:10:00'),
      fill: {
        odometer: odometerAt(niroFuel, date, 40),
        liters: null,
        price_per_liter: null,
        kwh,
        price_per_kwh: 0.2276,
        charge_type: 'charge',
      },
    };
  });

  const peugeot208 = generateEnergySeries(
    {
      vehicleId: DEMO_VEHICLE.peugeot208,
      firstId: 40_000,
      count: 30,
      intervalDays: 24,
      lastDaysAgo: 9,
      endOdometer: 118_000,
      kmPerDay: 25,
      kind: 'fuel',
      consumption: 6.3,
      price: e10,
      ownerFor: () => DEMO_DAUGHTER_ID,
    },
    today,
    random,
  );

  const vehicles: DemoVehicle[] = [
    {
      id: DEMO_VEHICLE.peugeot308,
      owner_id: DEMO_USER_ID,
      name: '308 SW',
      make: 'Peugeot',
      model: '308 SW',
      year: 2019,
      fuel_type: 'Diesel',
      created_at: toTimestamp(addMonths(today, -26), '09:20:00'),
      odometer: lastOdometer(peugeot308),
      plate: 'FG-308-CD',
      color: '#1e3a5f',
      status: 'active',
      vin: 'VF3LBYHZPKS204308',
      transmission: 'manual',
      image: null,
      tech_control_expiry: addDays(today, 12),
      financing_mode: 'owned',
      purchase_date: '2019-06-14',
      purchase_price: 24_900,
      co2_emission: 112,
    },
    {
      id: DEMO_VEHICLE.zoe,
      owner_id: DEMO_USER_ID,
      name: 'Zoé',
      make: 'Renault',
      model: 'Zoé E-Tech',
      year: 2021,
      fuel_type: 'Électrique',
      created_at: toTimestamp(addMonths(today, -25), '18:45:00'),
      odometer: lastOdometer(zoe),
      plate: 'GH-421-ZE',
      color: '#e5e7eb',
      status: 'active',
      vin: 'VF1AG000965421102',
      transmission: 'automatic',
      image: null,
      tech_control_expiry: addMonths(today, 11),
      financing_mode: 'loa',
      purchase_date: '2021-03-02',
      purchase_price: 32_990,
      co2_emission: 0,
    },
    {
      id: DEMO_VEHICLE.niro,
      owner_id: DEMO_PARTNER_ID,
      name: 'Niro',
      make: 'Kia',
      model: 'Niro hybride rechargeable',
      year: 2021,
      fuel_type: 'Hybride rechargeable',
      created_at: toTimestamp(addDays(addMonths(today, -25), 3), '21:05:00'),
      odometer: lastOdometer(niroFuel),
      plate: 'GK-112-NR',
      color: '#9ca3af',
      status: 'active',
      vin: 'KNACC81DGM5103112',
      transmission: 'automatic',
      image: null,
      tech_control_expiry: addMonths(today, 14),
      financing_mode: 'owned',
      purchase_date: '2021-09-20',
      purchase_price: 36_500,
      co2_emission: 29,
    },
    {
      id: DEMO_VEHICLE.peugeot208,
      owner_id: DEMO_DAUGHTER_ID,
      name: '208 de Léa',
      make: 'Peugeot',
      model: '208',
      year: 2016,
      fuel_type: 'Essence',
      created_at: toTimestamp(addMonths(today, -24), '18:30:00'),
      odometer: lastOdometer(peugeot208),
      plate: 'EZ-208-LD',
      color: '#dc2626',
      status: 'active',
      vin: 'VF3CCHMZ6GT104208',
      transmission: 'manual',
      image: null,
      tech_control_expiry: addMonths(today, 16),
      financing_mode: 'owned',
      purchase_date: '2023-07-08',
      purchase_price: 9_800,
      co2_emission: 104,
    },
  ];

  return {
    vehicles,
    energy: [...peugeot308, ...zoe, ...niroFuel, ...niroCharges, ...peugeot208],
    kmPerDay: {
      [DEMO_VEHICLE.peugeot308]: 58,
      [DEMO_VEHICLE.zoe]: 25,
      [DEMO_VEHICLE.niro]: 40,
      [DEMO_VEHICLE.peugeot208]: 25,
    },
  };
}
