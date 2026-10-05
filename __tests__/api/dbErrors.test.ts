import { describe, expect, it } from 'vitest';

import { dbErrorResponse } from '@/lib/api/dbErrors';

async function read(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe('dbErrorResponse', () => {
  it.each([
    [
      'Attachment limit per entity reached (10)',
      409,
      'Limite atteinte : 10 pièces jointes maximum par élément',
    ],
    [
      'Attachment limit per user reached (200)',
      409,
      'Limite atteinte : 200 pièces jointes maximum par compte',
    ],
    [
      'invalid input syntax for type date: "2026-13-45"',
      400,
      'Format de date invalide pour un des champs de date',
    ],
    ['null value in column "make" of relation "vehicles"', 400, 'La marque est requise'],
    ['null value in column "model" of relation "vehicles"', 400, 'Le modèle est requis'],
  ])('maps « %s » to a French %i', async (message, status, error) => {
    expect(await read(dbErrorResponse({ message }, 'Erreur'))).toEqual({
      status,
      body: { error },
    });
  });

  it('never leaks an unknown database message', async () => {
    const res = dbErrorResponse(
      { message: 'update or delete on table "vehicles" violates foreign key constraint' },
      'Erreur lors de la suppression du véhicule',
    );
    expect(await read(res)).toEqual({
      status: 500,
      body: { error: 'Erreur lors de la suppression du véhicule' },
    });
  });

  it('answers 403 when RLS or a trigger refuses the write', async () => {
    const res = dbErrorResponse(
      { message: 'new row violates row-level security policy', code: '42501' },
      'Erreur',
    );
    expect(await read(res)).toEqual({ status: 403, body: { error: 'Action non autorisée' } });
  });
});
