'use client';

/**
 * @file MaintenanceClient.tsx
 * @fileoverview Client component for the Maintenance page.
 *
 * Architecture:
 * - Receives pre-fetched vehicles and expenses from server (SSR/streaming)
 * - Handles form state (add/edit) locally
 * - Client-side filtering by selected vehicles and period
 * - Uses shared SelectorsContext for filter state
 */

import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import MaintenanceSuggestions from '@/app/(app)/maintenance/components/MaintenanceSuggestions';
import MaintenanceTimeline from '@/app/(app)/maintenance/components/MaintenanceTimeline';
import { useMaintenanceActions } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import MaintenanceForm from '@/components/common/forms/MaintenanceForm';
import ReminderForm from '@/components/common/forms/ReminderForm';
import Button from '@/components/common/ui/Button';
import Drawer from '@/components/common/ui/Drawer';
import Icon from '@/components/common/ui/Icon';
import { useSelectors } from '@/contexts/SelectorsContext';
import { useUser } from '@/contexts/UserContext';
import { useReminderActions } from '@/hooks/reminders/useReminderActions';
import { filterByVehiclesAndPeriod } from '@/lib/utils/filterUtils';
import { computeMaintenanceSuggestions } from '@/lib/utils/maintenanceInsights';

import type { MaintenanceFormData } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import type { MaintenanceTypeInfo } from '@/lib/data/maintenance/getMaintenanceTypes';
import type { MaintenanceSuggestion } from '@/lib/utils/maintenanceInsights';
import type { Expense } from '@/types/expense';
import type { ReminderFormData } from '@/types/reminder';
import type { VehicleMinimal } from '@/types/vehicle';

interface MaintenanceClientProps {
  vehicles: VehicleMinimal[];
  vehicleIds: number[];
  initialExpenses: Expense[];
  maintenanceTypes?: Record<string, MaintenanceTypeInfo>;
}

/**
 * Maintenance content component that uses shared selectors.
 * Gets user from UserProvider via useUser() hook.
 * Receives pre-fetched data from server for optimal SSR performance.
 */
function MaintenanceContent({
  vehicleIds,
  vehicles: initialVehicles,
  initialExpenses,
  maintenanceTypes = {},
}: {
  vehicleIds: number[];
  vehicles: VehicleMinimal[];
  initialExpenses: Expense[];
  maintenanceTypes?: Record<string, MaintenanceTypeInfo>;
}) {
  const router = useRouter();

  // Get user from UserProvider (set up in layout)
  const user = useUser();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderPrefill, setReminderPrefill] = useState<Partial<ReminderFormData> | undefined>();

  // Use ref to track if this is the initial load
  const isInitialLoad = useRef(true);

  // Expenses state - initialized with server data
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  // Track if we're refreshing data
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { saving, adding, deletingId, addMaintenance, updateMaintenance, deleteMaintenance } =
    useMaintenanceActions();
  const { creating, createReminder } = useReminderActions();

  const { selectedVehicleIds, selectedPeriod } = useSelectors();

  // Fetch fresh data only when vehicleIds change (not on every render)
  useEffect(() => {
    // Skip the initial load since we already have data from server
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Fetch fresh data when vehicleIds change
    if (vehicleIds.length > 0) {
      setIsRefreshing(true);
      fetch(`/api/expenses/maintenanceExpense?vehicleIds=${vehicleIds.join(',')}`)
        .then((res) => res.json())
        .then((data) => setExpenses(data.expenses || []))
        .catch((error) => console.error('Failed to fetch maintenance expenses:', error))
        .finally(() => setIsRefreshing(false));
    }
  }, [vehicleIds]);

  /**
   * Vehicles available in the form.
   * Only active vehicles owned by the current user,
   * plus the vehicle of the expense being edited.
   */
  const writableVehicleIds = useMemo(
    () =>
      new Set(
        initialVehicles
          .filter((v) => v.owner_id === user.id || v.permission_level === 'write')
          .map((v) => v.vehicle_id),
      ),
    [initialVehicles, user.id],
  );

  const vehicles = useMemo(() => {
    const activeVehicles = initialVehicles.filter((v) => {
      const isActive = v.status === 'active' || v.status == null;
      const canWrite = v.owner_id === user.id || v.permission_level === 'write';
      return isActive && canWrite;
    });

    if (!editingExpense) return activeVehicles;

    const editingVehicleId = editingExpense.vehicle_id;

    if (activeVehicles.some((v) => v.vehicle_id === editingVehicleId)) {
      return activeVehicles;
    }

    const editingVehicle = initialVehicles.find((v) => v.vehicle_id === editingVehicleId);

    return editingVehicle ? [...activeVehicles, editingVehicle] : activeVehicles;
  }, [initialVehicles, editingExpense, user.id]);

  /**
   * Filter expenses according to selectors.
   */
  const filteredExpenses = useMemo(
    () => filterByVehiclesAndPeriod(expenses, selectedVehicleIds, selectedPeriod),
    [expenses, selectedVehicleIds, selectedPeriod],
  );

  const suggestions = useMemo(
    () => computeMaintenanceSuggestions(expenses, vehicles, maintenanceTypes),
    [expenses, vehicles, maintenanceTypes],
  );

  const handleCreateReminderFromCard = useCallback((expense: Expense) => {
    setReminderPrefill({
      vehicle_id: expense.vehicle_id,
      type: 'maintenance',
      title: `Rappel : ${expense.maintenance_type_label || 'Entretien'}`,
    });
    setShowReminderForm(true);
  }, []);

  const handleCreateReminderFromSuggestion = useCallback((suggestion: MaintenanceSuggestion) => {
    setReminderPrefill({
      vehicle_id: suggestion.vehicleId,
      type: 'maintenance',
      title: `Rappel : ${suggestion.label}`,
      due_date: suggestion.suggestedDueDate ?? undefined,
      due_odometer: suggestion.suggestedDueOdometer ?? undefined,
    });
    setShowReminderForm(true);
  }, []);

  const handleReminderSave = useCallback(
    async (data: ReminderFormData): Promise<boolean> => {
      const success = await createReminder(data);
      if (success) setShowReminderForm(false);
      return success;
    },
    [createReminder],
  );

  /**
   * Handlers
   */
  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingExpense(null);
  }, []);

  const handleSaveForm = useCallback(
    async (
      data: MaintenanceFormData,
      expenseId?: number,
      pendingFiles?: File[],
    ): Promise<boolean> => {
      const success = expenseId
        ? await updateMaintenance(expenseId, data)
        : await addMaintenance(data, pendingFiles);

      if (success) {
        handleCancelForm();
        router.refresh();
      }

      return success;
    },
    [addMaintenance, updateMaintenance, handleCancelForm, router],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: number) => {
      setDeletingAttachmentId(attachmentId);
      try {
        const res = await fetch('/api/attachments/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_id: attachmentId }),
        });
        if (res.ok) router.refresh();
      } finally {
        setDeletingAttachmentId(null);
      }
    },
    [router],
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: number): Promise<boolean> => {
      const success = await deleteMaintenance(expenseId);
      if (success) {
        router.refresh();
      }
      return success;
    },
    [deleteMaintenance, router],
  );

  /**
   * Empty state
   */
  if (vehicles.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-custom-1 rounded-full flex items-center justify-center mb-5">
          <Icon name="tool" size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">
          Aucun entretien à afficher
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
          Ajoutez un véhicule dans votre garage pour commencer à suivre vos entretiens.
        </p>
        <Button
          variant="secondary"
          size="lg"
          leftIcon={<Icon name="car" size={18} />}
          onClick={() => router.push('/garage')}
        >
          Aller au garage
        </Button>
      </div>
    );
  }

  const handleAddClick = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <MaintenanceSuggestions
        suggestions={suggestions}
        onCreateReminder={handleCreateReminderFromSuggestion}
      />

      <MaintenanceTimeline
        vehicles={initialVehicles}
        expenses={filteredExpenses}
        writableVehicleIds={writableVehicleIds}
        onAdd={handleAddClick}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onCreateReminder={handleCreateReminderFromCard}
        deletingId={deletingId}
        isDataLoading={isRefreshing}
        onDeleteAttachment={handleDeleteAttachment}
        deletingAttachmentId={deletingAttachmentId}
      />

      {/* Mobile FAB */}
      <button
        onClick={handleAddClick}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-custom-2 hover:bg-custom-2-hover text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer"
        aria-label="Ajouter une intervention"
      >
        <Icon name="add" size={24} />
      </button>

      {/* Maintenance form drawer */}
      <Drawer isOpen={showForm} onClose={handleCancelForm}>
        <MaintenanceForm
          initialExpense={editingExpense}
          vehicles={vehicles}
          onSave={handleSaveForm}
          onCancel={handleCancelForm}
          saving={!editingExpense ? adding : saving}
        />
      </Drawer>

      {/* Reminder form drawer */}
      <Drawer isOpen={showReminderForm} onClose={() => setShowReminderForm(false)}>
        <ReminderForm
          initialReminder={null}
          prefill={reminderPrefill}
          vehicles={vehicles}
          onSave={handleReminderSave}
          onCancel={() => setShowReminderForm(false)}
          saving={creating}
        />
      </Drawer>
    </div>
  );
}

/**
 * Maintenance client component with shared selectors.
 * SelectorsProvider is provided by the root layout.
 * User is retrieved from UserProvider via useUser() hook.
 */
export default function MaintenanceClient({
  vehicles,
  vehicleIds,
  initialExpenses,
  maintenanceTypes,
}: MaintenanceClientProps) {
  return (
    <MaintenanceContent
      vehicles={vehicles}
      vehicleIds={vehicleIds}
      initialExpenses={initialExpenses}
      maintenanceTypes={maintenanceTypes}
    />
  );
}
