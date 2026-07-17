'use client';

/**
 * @file GarageClient.tsx
 * @fileoverview Client component for the Garage page.
 *
 * Handles view state management (list, detail, form) and uses the useGarageActions hook
 * for business logic.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

import VehicleForm from '@/app/(app)/garage/components/forms/VehicleForm';
import VehicleDetail from '@/app/(app)/garage/components/VehicleDetail';

import EmptyGarage from './components/EmptyGarage';
import { FamilyVehiclesList } from './components/FamilyVehiclesList';
import { GarageVehiclesList } from './components/GarageVehiclesList';
import { useGarageActions } from './hooks/useGarageActions';

import type { Expense } from '@/types/expense';
import type { FamilyMemberDisplay } from '@/types/family';
import type { UserPreferences } from '@/types/userPreferences';
import type { Vehicle } from '@/types/vehicle';

interface FamilyGroup {
  familyId: string;
  familyName: string;
  vehicles: Vehicle[];
}

interface GarageClientProps {
  userVehicles: Vehicle[];
  familyGroups?: FamilyGroup[];
  familyMembers?: FamilyMemberDisplay[] | null;
  expenses?: Expense[];
  activeInsuranceVehicleIds?: number[];
  familyOwnerPreferences?: Record<string, UserPreferences>;
}

export default function GarageClient({
  userVehicles,
  familyGroups = [],
  familyMembers,
  expenses,
  activeInsuranceVehicleIds,
  familyOwnerPreferences,
}: GarageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    isSubmitting,
    viewState,
    selectedVehicle,
    isEditing,
    handleSaveVehicle,
    handleVehicleClick,
    handleEdit,
    handleAddNew,
    handleCancel,
    handleBack,
    updateOdometer,
  } = useGarageActions();

  // Flat list of all family vehicles (for helper lookups)
  const allFamilyVehicles = familyGroups.flatMap((g) => g.vehicles);

  // --- Modal ouverture selon search param ---
  useEffect(() => {
    if (searchParams.get('addVehicle') === 'true') {
      handleAddNew();
      return;
    }
    const vehicleIdParam = searchParams.get('vehicleId');
    if (vehicleIdParam) {
      const id = Number(vehicleIdParam);
      const found =
        userVehicles.find((v) => v.vehicle_id === id) ??
        allFamilyVehicles.find((v) => v.vehicle_id === id);
      if (found) {
        handleVehicleClick(found);
        // Nettoyer le param de l'URL pour que le bouton retour fonctionne proprement
        router.replace('/garage');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Helper to check if vehicle is from family
  const isFamilyVehicle = (vehicle: Vehicle) =>
    allFamilyVehicles.some((fv) => fv.vehicle_id === vehicle.vehicle_id);

  // Helper to get owner info for a family vehicle
  const getOwnerInfo = (vehicle: Vehicle) => {
    if (!vehicle.owner_id || !familyMembers) return null;
    const member = familyMembers.find((m) => m.user_id === vehicle.owner_id);
    if (!member) return null;
    return {
      user_id: member.user_id,
      user_name: member.user_name,
      avatar_url: member.avatar_url,
    };
  };

  // Personal vehicles
  const personalVehicles = userVehicles || [];

  // --- Empty garage ---
  if (personalVehicles.length === 0 && allFamilyVehicles.length === 0 && viewState === 'list') {
    return <EmptyGarage onAddVehicle={handleAddNew} />;
  }

  // --- Form view ---
  if (viewState === 'form') {
    return (
      <VehicleForm
        vehicle={isEditing ? selectedVehicle : null}
        onSave={handleSaveVehicle}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    );
  }

  // --- Detail view ---
  if (viewState === 'detail' && selectedVehicle) {
    const detailOwnerInfo = isFamilyVehicle(selectedVehicle)
      ? getOwnerInfo(selectedVehicle)
      : undefined;

    const ownerPrefs = detailOwnerInfo?.user_id
      ? (familyOwnerPreferences?.[detailOwnerInfo.user_id] ?? null)
      : null;

    return (
      <VehicleDetail
        vehicle={selectedVehicle}
        onBack={handleBack}
        onEdit={() => handleEdit(selectedVehicle)}
        isFamilyVehicle={isFamilyVehicle(selectedVehicle)}
        owner={detailOwnerInfo ?? undefined}
        expenses={expenses}
        hasActiveInsurance={activeInsuranceVehicleIds?.includes(selectedVehicle.vehicle_id)}
        ownerPreferences={ownerPrefs}
      />
    );
  }

  // --- List view ---
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section: Mes Véhicules */}
      <GarageVehiclesList
        vehicles={personalVehicles}
        onVehicleClick={handleVehicleClick}
        onAddVehicle={handleAddNew}
        activeInsuranceVehicleIds={activeInsuranceVehicleIds}
        onOdometerUpdate={updateOdometer}
      />

      {/* Section: Véhicules par famille */}
      {familyGroups.map((group) => (
        <FamilyVehiclesList
          key={group.familyId}
          familyName={group.familyName}
          vehicles={group.vehicles}
          familyMembers={familyMembers || []}
          onVehicleClick={handleVehicleClick}
        />
      ))}
    </div>
  );
}
