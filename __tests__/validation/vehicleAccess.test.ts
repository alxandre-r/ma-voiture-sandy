import { describe, expect, it } from 'vitest';

import { canWriteRow, canWriteVehicle, hasWriteAccess } from '@/lib/api/vehicleAccess';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Client whose vehicles_for_display lookup returns `row`. */
const client = (row: { owner_id: string; permission_level: string | null } | null) =>
  ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }),
  }) as unknown as SupabaseClient;

describe('hasWriteAccess (rule used inline by the add routes)', () => {
  it('owner or write permission only', () => {
    expect(hasWriteAccess({ owner_id: 'me', permission_level: null }, 'me')).toBe(true);
    expect(hasWriteAccess({ owner_id: 'o', permission_level: 'write' }, 'me')).toBe(true);
    expect(hasWriteAccess({ owner_id: 'o', permission_level: 'read' }, 'me')).toBe(false);
    expect(hasWriteAccess({ owner_id: 'o' }, 'me')).toBe(false);
  });
});

describe('canWriteVehicle', () => {
  it('allows the vehicle owner (no permission row needed)', async () => {
    expect(await canWriteVehicle(client({ owner_id: 'me', permission_level: null }), 1, 'me')).toBe(true);
  });
  it('allows a write permission, refuses read and unknown vehicles', async () => {
    expect(await canWriteVehicle(client({ owner_id: 'o', permission_level: 'write' }), 1, 'me')).toBe(true);
    expect(await canWriteVehicle(client({ owner_id: 'o', permission_level: 'read' }), 1, 'me')).toBe(false);
    expect(await canWriteVehicle(client(null), 1, 'me')).toBe(false);
  });
});

describe('canWriteRow (P3.9)', () => {
  it("lets the vehicle owner edit a row a family member created", async () => {
    const row = { owner_id: 'member', vehicle_id: 1 };
    expect(await canWriteRow(client({ owner_id: 'me', permission_level: null }), row, 'me')).toBe(true);
  });
  it('lets the creator edit without a lookup, refuses others', async () => {
    expect(await canWriteRow(client(null), { owner_id: 'me', vehicle_id: 1 }, 'me')).toBe(true);
    const row = { owner_id: 'other', vehicle_id: 1 };
    expect(await canWriteRow(client({ owner_id: 'other', permission_level: 'read' }), row, 'me')).toBe(false);
  });
});
