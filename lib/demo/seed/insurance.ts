import { DEMO_DAUGHTER_ID, DEMO_PARTNER_ID, DEMO_USER_ID, DEMO_VEHICLE } from '../constants';
import { addDays, addMonths } from '../dates';

import type { DemoInsuranceContract } from '../types';

export function seedInsuranceContracts(today: string): DemoInsuranceContract[] {
  const switchDate = addMonths(today, -14);
  return [
    {
      id: 501,
      vehicle_id: DEMO_VEHICLE.peugeot308,
      owner_id: DEMO_USER_ID,
      monthly_cost: 52.4,
      start_date: addMonths(today, -26),
      end_date: addDays(switchDate, -1),
      provider: 'Assurance Horizon',
    },
    {
      id: 502,
      vehicle_id: DEMO_VEHICLE.peugeot308,
      owner_id: DEMO_USER_ID,
      monthly_cost: 46.2,
      start_date: switchDate,
      end_date: null,
      provider: 'Mutuelle des Routes',
    },
    {
      id: 503,
      vehicle_id: DEMO_VEHICLE.zoe,
      owner_id: DEMO_USER_ID,
      monthly_cost: 29.9,
      start_date: addMonths(today, -24),
      end_date: null,
      provider: 'Mutuelle des Routes',
    },
    {
      id: 504,
      vehicle_id: DEMO_VEHICLE.niro,
      owner_id: DEMO_PARTNER_ID,
      monthly_cost: 38.5,
      start_date: addDays(addMonths(today, -24), 5),
      end_date: null,
      provider: 'Prévoyance Auto',
    },
    {
      id: 505,
      vehicle_id: DEMO_VEHICLE.peugeot208,
      owner_id: DEMO_DAUGHTER_ID,
      monthly_cost: 71.3,
      start_date: addDays(addMonths(today, -24), 12),
      end_date: null,
      provider: 'Assurance Horizon',
    },
  ];
}
