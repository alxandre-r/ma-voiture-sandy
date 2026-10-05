import {
  canWriteVehicle,
  isActiveVehicle,
  writableActiveVehicles,
} from '@/lib/utils/vehicleAccess';

describe('canWriteVehicle', () => {
  it('allows the owner and write members', () => {
    expect(canWriteVehicle({ owner_id: 'u1' }, 'u1')).toBe(true);
    expect(canWriteVehicle({ owner_id: 'u2', permission_level: 'write' }, 'u1')).toBe(true);
  });

  it('refuses read members, missing vehicles and a missing user on ownerless rows', () => {
    expect(canWriteVehicle({ owner_id: 'u2', permission_level: 'read' }, 'u1')).toBe(false);
    expect(canWriteVehicle(null, 'u1')).toBe(false);
    expect(canWriteVehicle({ owner_id: undefined }, undefined)).toBe(false);
  });
});

describe('isActiveVehicle', () => {
  it('treats a null status as active', () => {
    expect(isActiveVehicle({ status: null })).toBe(true);
    expect(isActiveVehicle({ status: 'active' })).toBe(true);
    expect(isActiveVehicle({ status: 'sold' })).toBe(false);
  });
});

describe('writableActiveVehicles', () => {
  it('keeps the active vehicles the user can write to', () => {
    const vehicles = [
      { vehicle_id: 1, owner_id: 'u1', status: 'active' },
      { vehicle_id: 2, owner_id: 'u1', status: 'sold' },
      { vehicle_id: 3, owner_id: 'u2', permission_level: 'write', status: null },
      { vehicle_id: 4, owner_id: 'u2', permission_level: 'read', status: 'active' },
    ];
    expect(writableActiveVehicles(vehicles, 'u1').map((v) => v.vehicle_id)).toEqual([1, 3]);
  });
});
