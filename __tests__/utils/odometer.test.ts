import { describe, expect, it, vi } from 'vitest';

import { parseOdometer, raiseVehicleOdometer } from '@/lib/utils/odometer';

import type { SupabaseClient } from '@supabase/supabase-js';

describe('parseOdometer', () => {
  it.each([
    [92_900, 92_900],
    ['92900', 92_900],
    [' 15 ', 15],
  ])('%s -> %s', (input, expected) => {
    expect(parseOdometer(input)).toBe(expected);
  });

  it.each([[0], [-5], [12.5], [''], ['abc'], [null], [undefined], [Number.NaN]])(
    'rejects %s',
    (input) => {
      expect(parseOdometer(input)).toBeNull();
    },
  );
});

describe('raiseVehicleOdometer', () => {
  it('updates only when the stored odometer is lower', async () => {
    const lt = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn(() => ({ lt }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    await raiseVehicleOdometer({ from } as unknown as SupabaseClient, 84, 92_900);
    expect(from).toHaveBeenCalledWith('vehicles');
    expect(update).toHaveBeenCalledWith({ odometer: 92_900 });
    expect(eq).toHaveBeenCalledWith('id', 84);
    expect(lt).toHaveBeenCalledWith('odometer', 92_900);
  });
});
