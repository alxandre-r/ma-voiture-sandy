'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  ExpenseBreakdown,
  RecentExpenses,
  StatsCards,
  VehicleQuickView,
} from '@/app/(app)/dashboard/components';
import InsightsPanel from '@/app/(app)/dashboard/components/InsightsPanel';
import RemindersWidget from '@/app/(app)/dashboard/components/RemindersWidget';
import { useMaintenanceActions } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import ContextBadge from '@/components/common/ContextBadge';
import ExpenseButton from '@/components/common/ExpenseButton';
import FillForm from '@/components/common/forms/FillForm';
import MaintenanceForm from '@/components/common/forms/MaintenanceForm';
import OtherForm from '@/components/common/forms/OtherForm';
import ReminderForm from '@/components/common/forms/ReminderForm';
import Drawer from '@/components/common/ui/Drawer';
import { useSelectors } from '@/contexts/SelectorsContext';
import { useUser } from '@/contexts/UserContext';
import { useFillActions } from '@/hooks/fill/useFillActions';
import { useOtherActions } from '@/hooks/other/useOtherActions';
import { useReminderActions } from '@/hooks/reminders/useReminderActions';
import { detectAnomalies } from '@/lib/utils/anomalyUtils';
import { getEffectivePeriodRange, getPreviousPeriodRange } from '@/lib/utils/filterUtils';

import type { MaintenanceFormData } from '@/app/(app)/maintenance/hooks/useMaintenanceActions';
import type { ExpenseType } from '@/components/common/ExpenseButton';
import type { OtherFormData } from '@/hooks/other/useOtherActions';
import type { Expense } from '@/types/expense';
import type { Fill, FillFormData } from '@/types/fill';
import type { Reminder, ReminderFormData } from '@/types/reminder';
import type { Vehicle, VehicleMinimal } from '@/types/vehicle';

interface DashboardClientProps {
  vehicles: Vehicle[];
  expenses: Expense[];
  reminders: Reminder[];
  fillExpenses: Expense[];
  activeInsuranceVehicleIds?: number[];
}

function DashboardContent({
  vehicles,
  expenses,
  reminders,
  fillExpenses,
  activeInsuranceVehicleIds,
}: DashboardClientProps) {
  const router = useRouter();
  const user = useUser();
  const currentUserId = user?.id;
  const { selectedVehicleIds, selectedPeriod } = useSelectors();

  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [showFillForm, setShowFillForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showEditFillForm, setShowEditFillForm] = useState(false);
  const [editingFillExpense, setEditingFillExpense] = useState<Expense | null>(null);
  const [savingEditFill, setSavingEditFill] = useState(false);

  const { addFill, adding, updateFill } = useFillActions();
  const { addMaintenance } = useMaintenanceActions();
  const { addOther } = useOtherActions();
  const { creating, createReminder } = useReminderActions();

  const filteredExpenses = useMemo(() => {
    const byVehicle = expenses.filter((e) => selectedVehicleIds.includes(e.vehicle_id));
    const { start, end } = getEffectivePeriodRange(selectedPeriod);
    let result = start ? byVehicle.filter((e) => new Date(e.date) >= start) : byVehicle;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.date) <= endOfDay);
    }
    return result;
  }, [expenses, selectedVehicleIds, selectedPeriod]);

  const sortedExpenses = useMemo(
    () =>
      [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredExpenses],
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [filteredExpenses],
  );

  // Previous period expenses for trend computation
  const previousPeriodExpenses = useMemo(() => {
    const prevRange = getPreviousPeriodRange(selectedPeriod);
    if (!prevRange || !prevRange.start) return [];
    const byVehicle = expenses.filter((e) => selectedVehicleIds.includes(e.vehicle_id));
    let result = byVehicle.filter((e) => new Date(e.date) >= prevRange.start!);
    if (prevRange.end) {
      result = result.filter((e) => new Date(e.date) <= prevRange.end!);
    }
    return result;
  }, [expenses, selectedVehicleIds, selectedPeriod]);

  const prevTotalExpenses = useMemo(
    () =>
      previousPeriodExpenses.length > 0
        ? previousPeriodExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
        : null,
    [previousPeriodExpenses],
  );

  const avgConsumption = useMemo(() => {
    const fuelExpenses = filteredExpenses.filter((e) => e.type === 'fuel');
    if (fuelExpenses.length === 0) return 0;

    let totalLiters = 0;
    let totalDistance = 0;
    const odometers: Record<number, number[]> = {};

    fuelExpenses.forEach((expense) => {
      const fillData = expense as unknown as { liters?: number; odometer?: number };
      if (fillData.liters) totalLiters += fillData.liters;
      if (fillData.odometer) {
        if (!odometers[expense.vehicle_id]) odometers[expense.vehicle_id] = [];
        odometers[expense.vehicle_id].push(fillData.odometer);
      }
    });

    Object.values(odometers).forEach((values) => {
      if (values.length >= 2) {
        const sorted = [...values].sort((a, b) => a - b);
        totalDistance += sorted[sorted.length - 1] - sorted[0];
      }
    });

    return totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
  }, [filteredExpenses]);

  const costPer100km = useMemo(() => {
    const fuelExpenses = filteredExpenses.filter((e) => e.type === 'fuel');
    if (fuelExpenses.length === 0) return null;
    let totalDistance = 0;
    const odometers: Record<number, number[]> = {};
    fuelExpenses.forEach((expense) => {
      const fillData = expense as unknown as { odometer?: number };
      if (fillData.odometer) {
        if (!odometers[expense.vehicle_id]) odometers[expense.vehicle_id] = [];
        odometers[expense.vehicle_id].push(fillData.odometer);
      }
    });
    Object.values(odometers).forEach((values) => {
      if (values.length >= 2) {
        const sorted = [...values].sort((a, b) => a - b);
        totalDistance += sorted[sorted.length - 1] - sorted[0];
      }
    });
    if (totalDistance === 0) return null;
    return (totalExpenses / totalDistance) * 100;
  }, [filteredExpenses, totalExpenses]);

  const prevAvgConsumption = useMemo(() => {
    const fuelExpenses = previousPeriodExpenses.filter((e) => e.type === 'fuel');
    if (fuelExpenses.length === 0) return null;
    let totalLiters = 0;
    let totalDistance = 0;
    const odometers: Record<number, number[]> = {};
    fuelExpenses.forEach((expense) => {
      const fillData = expense as unknown as { liters?: number; odometer?: number };
      if (fillData.liters) totalLiters += fillData.liters;
      if (fillData.odometer) {
        if (!odometers[expense.vehicle_id]) odometers[expense.vehicle_id] = [];
        odometers[expense.vehicle_id].push(fillData.odometer);
      }
    });
    Object.values(odometers).forEach((values) => {
      if (values.length >= 2) {
        const sorted = [...values].sort((a, b) => a - b);
        totalDistance += sorted[sorted.length - 1] - sorted[0];
      }
    });
    return totalDistance > 0 ? (totalLiters / totalDistance) * 100 : null;
  }, [previousPeriodExpenses]);

  const anomalies = useMemo(
    () => detectAnomalies(fillExpenses, vehicles),
    [fillExpenses, vehicles],
  );

  const lastFill = useMemo(() => {
    const selected = fillExpenses
      .filter((e) => selectedVehicleIds.includes(e.vehicle_id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return selected[0] ?? null;
  }, [fillExpenses, selectedVehicleIds]);

  const writableActiveVehicles = vehicles.filter((v) => {
    const isActive = v.status === 'active' || v.status === null || v.status === undefined;
    const canWrite = v.owner_id === currentUserId || v.permission_level === 'write';
    return isActive && canWrite;
  });

  const fillVehicles = writableActiveVehicles.filter(
    (v) => v.fuel_type !== 'Électrique' && v.fuel_type !== 'Hybride non rechargeable',
  );
  const chargeVehicles = writableActiveVehicles.filter(
    (v) => v.fuel_type === 'Électrique' || v.fuel_type === 'Hybride rechargeable',
  );
  const formVehicles = selectedExpenseType === 'charge' ? chargeVehicles : fillVehicles;

  const vehiclesMinimal: VehicleMinimal[] = writableActiveVehicles.map((v) => ({
    vehicle_id: v.vehicle_id,
    name: v.name ?? `${v.make} ${v.model}`,
    make: v.make ?? '',
    model: v.model ?? '',
    fuel_type: v.fuel_type ?? null,
    odometer: v.odometer,
    status: v.status ?? 'active',
    owner_id: v.owner_id,
    permission_level: v.permission_level ?? null,
  }));

  const handleSuccess = () => {
    router.refresh();
    setShowFillForm(false);
    setShowMaintenanceForm(false);
    setShowOtherForm(false);
    setShowReminderForm(false);
    setSelectedExpenseType(null);
  };

  const handleSelectType = (type: ExpenseType) => {
    setSelectedExpenseType(type);
    if (type === 'maintenance') {
      setShowMaintenanceForm(true);
    } else if (type === 'other') {
      setShowOtherForm(true);
    } else {
      setShowFillForm(true);
    }
  };

  const handleEditFill = (expense: Expense) => {
    setEditingFillExpense(expense);
    setShowEditFillForm(true);
  };

  const handleEditFillSave = async (data: FillFormData, fillId?: number): Promise<boolean> => {
    if (!fillId) return false;
    setSavingEditFill(true);
    const success = await updateFill(fillId, data);
    setSavingEditFill(false);
    if (success) {
      setShowEditFillForm(false);
      setEditingFillExpense(null);
      router.refresh();
    }
    return success;
  };

  const editFillInitial: Fill | null = editingFillExpense
    ? {
        id: editingFillExpense.id,
        expense_id: editingFillExpense.id,
        vehicle_id: editingFillExpense.vehicle_id,
        owner: editingFillExpense.owner_id,
        date: editingFillExpense.date,
        odometer: editingFillExpense.odometer ?? 0,
        liters: editingFillExpense.liters ?? 0,
        amount: editingFillExpense.amount ?? 0,
        price_per_liter: editingFillExpense.price_per_liter ?? 0,
        notes: editingFillExpense.notes,
        charge_type: editingFillExpense.type === 'electric_charge' ? 'charge' : 'fill',
        kwh: editingFillExpense.kwh ?? null,
        price_per_kwh: editingFillExpense.price_per_kwh ?? null,
      }
    : null;

  const handleFillSave = async (data: FillFormData, _fillId?: number, pendingFiles?: File[]) => {
    const success = await addFill(data, pendingFiles);
    if (success) handleSuccess();
    return success;
  };

  const handleMaintenanceSave = async (
    data: MaintenanceFormData,
    _expenseId?: number,
    pendingFiles?: File[],
  ) => {
    const success = await addMaintenance(data, pendingFiles);
    if (success) handleSuccess();
    return success;
  };

  const handleOtherSave = async (
    data: OtherFormData,
    _expenseId?: number,
    pendingFiles?: File[],
  ) => {
    const success = await addOther(data, pendingFiles);
    if (success) handleSuccess();
    return success;
  };

  const handleReminderSave = async (data: ReminderFormData): Promise<boolean> => {
    const success = await createReminder(data);
    if (success) handleSuccess();
    return success;
  };

  return (
    <div className="space-y-6 px-2 sm:px-0 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header row: context badge left, add button right */}
      <div className="flex items-center justify-between gap-4">
        <ContextBadge />
        <div className="hidden sm:block shrink-0">
          <ExpenseButton
            vehicles={vehicles as VehicleMinimal[]}
            currentUserId={currentUserId}
            onSelectType={handleSelectType}
            onAddReminder={() => setShowReminderForm(true)}
          />
        </div>
      </div>

      {/* Stats cards — full width */}
      <StatsCards
        expenseCount={filteredExpenses.length}
        totalExpenses={totalExpenses}
        prevTotalExpenses={prevTotalExpenses}
        avgConsumption={avgConsumption}
        prevAvgConsumption={prevAvgConsumption}
        costPer100km={costPer100km}
        lastFill={lastFill}
        onEditLastFill={lastFill ? () => handleEditFill(lastFill) : undefined}
      />

      {/* Insights panel — only renders when there are actionable items */}
      <InsightsPanel
        vehicles={vehicles}
        reminders={reminders}
        expenses={expenses}
        activeInsuranceVehicleIds={activeInsuranceVehicleIds}
        anomalies={anomalies}
      />

      {/* Recent Expenses + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentExpenses expenses={sortedExpenses} vehicles={vehicles} />
        <RemindersWidget reminders={reminders} vehicles={vehicles} fillExpenses={fillExpenses} />
      </div>

      {/* Expense breakdown + Vehicle overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseBreakdown expenses={filteredExpenses} />
        <VehicleQuickView
          vehicles={vehicles}
          reminders={reminders}
          expenses={expenses}
          activeInsuranceVehicleIds={activeInsuranceVehicleIds}
        />
      </div>

      {/* Drawers */}
      <Drawer
        isOpen={showFillForm && !!selectedExpenseType}
        onClose={() => {
          setShowFillForm(false);
          setSelectedExpenseType(null);
        }}
      >
        <FillForm
          vehicles={formVehicles as VehicleMinimal[]}
          forcedType={selectedExpenseType === 'charge' ? 'charge' : 'fill'}
          onSave={handleFillSave}
          onCancel={() => {
            setShowFillForm(false);
            setSelectedExpenseType(null);
          }}
          saving={adding}
        />
      </Drawer>

      <Drawer
        isOpen={showMaintenanceForm}
        onClose={() => {
          setShowMaintenanceForm(false);
          setSelectedExpenseType(null);
        }}
      >
        <MaintenanceForm
          vehicles={vehiclesMinimal}
          onSave={handleMaintenanceSave}
          onCancel={() => {
            setShowMaintenanceForm(false);
            setSelectedExpenseType(null);
          }}
          saving={false}
        />
      </Drawer>

      <Drawer
        isOpen={showOtherForm}
        onClose={() => {
          setShowOtherForm(false);
          setSelectedExpenseType(null);
        }}
      >
        <OtherForm
          vehicles={vehiclesMinimal}
          onSave={handleOtherSave}
          onCancel={() => {
            setShowOtherForm(false);
            setSelectedExpenseType(null);
          }}
        />
      </Drawer>

      <Drawer
        isOpen={showEditFillForm}
        onClose={() => {
          setShowEditFillForm(false);
          setEditingFillExpense(null);
        }}
      >
        {editFillInitial && (
          <FillForm
            vehicles={writableActiveVehicles as VehicleMinimal[]}
            initialFill={editFillInitial}
            forcedType={editingFillExpense?.type === 'electric_charge' ? 'charge' : 'fill'}
            onSave={handleEditFillSave}
            onCancel={() => {
              setShowEditFillForm(false);
              setEditingFillExpense(null);
            }}
            saving={savingEditFill}
          />
        )}
      </Drawer>

      <Drawer isOpen={showReminderForm} onClose={() => setShowReminderForm(false)}>
        <ReminderForm
          initialReminder={null}
          vehicles={vehiclesMinimal}
          onSave={handleReminderSave}
          onCancel={() => setShowReminderForm(false)}
          saving={creating}
        />
      </Drawer>
    </div>
  );
}

export default function DashboardClient({
  vehicles,
  expenses,
  reminders,
  fillExpenses,
  activeInsuranceVehicleIds,
}: DashboardClientProps) {
  return (
    <DashboardContent
      vehicles={vehicles}
      expenses={expenses}
      reminders={reminders}
      fillExpenses={fillExpenses}
      activeInsuranceVehicleIds={activeInsuranceVehicleIds}
    />
  );
}
