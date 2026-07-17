/**
 * Validates the base fields common to all expense types (fill, maintenance, other).
 * Calls showError with a user-facing message and returns false on the first failure.
 */
export function validateBaseExpenseFields(
  data: { vehicle_id?: number | null; date?: string | null; amount?: number | null },
  showError: (message: string) => void,
): boolean {
  if (!data.vehicle_id || data.vehicle_id === 0) {
    showError('Veuillez sélectionner un véhicule');
    return false;
  }
  if (!data.date) {
    showError('Veuillez entrer une date');
    return false;
  }
  if (data.amount == null || data.amount <= 0) {
    showError('Veuillez entrer un montant valide');
    return false;
  }
  return true;
}
