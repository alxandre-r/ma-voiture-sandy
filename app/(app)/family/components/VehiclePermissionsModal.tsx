'use client';

/**
 * @file VehiclePermissionsModal.tsx
 * @fileoverview Modal de gestion des droits d'accès à un véhicule par famille.
 */

import { useEffect, useState } from 'react';

import { Modal } from '@/components/common/ui/Modal';
import { useNotifications } from '@/contexts/NotificationContext';

type Permission = 'none' | 'read' | 'edit';

interface MemberPermission {
  user_id: string;
  user_name: string;
  permission: Permission;
}

interface VehiclePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  vehicleLabel: string;
  members: Array<{ user_id: string; user_name: string }>;
  currentUserId: string;
}

const LABELS: Record<Permission, string> = {
  none: 'Aucun',
  read: 'Lecture',
  edit: 'Modification',
};

export function VehiclePermissionsModal({
  isOpen,
  onClose,
  vehicleId,
  vehicleLabel,
  members,
  currentUserId,
}: VehiclePermissionsModalProps) {
  const { showSuccess, showError } = useNotifications();

  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  const [permissions, setPermissions] = useState<MemberPermission[]>(() =>
    otherMembers.map((m) => ({ user_id: m.user_id, user_name: m.user_name, permission: 'none' })),
  );
  const [loadingInit, setLoadingInit] = useState(true);
  // Set when the current permissions could not be read: saving would then overwrite them blindly
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingInit(true);
    setLoadError(null);
    fetch(`/api/vehicles/permissions?vehicleId=${vehicleId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error ?? 'Impossible de charger les droits actuels.');
        }
        return body as { data: { user_id: string; permission_level: 'read' | 'write' }[] | null };
      })
      .then(({ data }) => {
        if (cancelled) return;
        const dbMap = new Map(data?.map((d) => [d.user_id, d.permission_level]) ?? []);
        setPermissions(
          otherMembers.map((m) => ({
            user_id: m.user_id,
            user_name: m.user_name,
            permission: dbMap.has(m.user_id)
              ? dbMap.get(m.user_id) === 'write'
                ? 'edit'
                : 'read'
              : 'none',
          })),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'Impossible de charger les droits actuels.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingInit(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vehicleId]);

  const setPermission = (userId: string, perm: Permission) => {
    setPermissions((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, permission: perm } : p)),
    );
  };

  const handleSave = async () => {
    if (loadError) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vehicles/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          permissions: permissions.map((p) => ({
            userId: p.user_id,
            level: p.permission === 'edit' ? 'write' : p.permission,
          })),
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        showError(error ?? 'Erreur lors de la sauvegarde des droits.');
        return;
      }

      showSuccess('Droits mis à jour avec succès.');
      onClose();
    } catch {
      showError('Erreur réseau lors de la sauvegarde des droits.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Droits d'accès — ${vehicleLabel}`} size="md">
      {otherMembers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Aucun autre membre dans cette famille.
        </p>
      ) : loadingInit ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-custom-1 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {loadError ? (
            <p
              role="alert"
              className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2"
            >
              {loadError} Les droits ne peuvent pas être modifiés pour le moment, réessayez plus
              tard.
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Définissez le niveau d&apos;accès de chaque membre à ce véhicule.
            </p>
          )}

          <div className="space-y-3">
            {permissions.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                  {member.user_name}
                </span>

                {/* Segmented toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-shrink-0">
                  {(['none', 'read', 'edit'] as Permission[]).map((perm) => (
                    <button
                      key={perm}
                      onClick={() => setPermission(member.user_id, perm)}
                      disabled={saving || !!loadError}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        member.permission === perm
                          ? perm === 'edit'
                            ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                            : perm === 'read'
                              ? 'bg-white dark:bg-gray-800 text-custom-1 shadow-sm'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {LABELS[perm]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!loadError}
              className="px-4 py-2 text-sm font-semibold bg-custom-1 hover:bg-custom-1-hover text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
