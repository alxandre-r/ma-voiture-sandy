'use client';

import ReminderCard from '@/app/(app)/reminders/components/ReminderCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import { canWriteReminder } from '@/lib/utils/reminderUtils';

import type { ReminderWithStatus } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

interface UpcomingRemindersProps {
  reminders: ReminderWithStatus[];
  vehicles: Vehicle[];
  currentUserId?: string;
  onComplete: (id: number, completed: boolean) => void;
  onEdit: (reminder: ReminderWithStatus) => void;
  onDelete: (id: number) => void;
  completingId: number | null;
  deletingId: number | null;
  showCompleted?: boolean;
  onDeleteAttachment?: (attachmentId: number) => void;
  deletingAttachmentId?: number | null;
}

function groupByVehicle(
  reminders: ReminderWithStatus[],
  vehicles: Vehicle[],
): { vehicle: Vehicle | null; reminders: ReminderWithStatus[] }[] {
  const vehicleMap = new Map<number | null, ReminderWithStatus[]>();

  for (const r of reminders) {
    const key = r.vehicle_id;
    if (!vehicleMap.has(key)) vehicleMap.set(key, []);
    vehicleMap.get(key)!.push(r);
  }

  const groups: { vehicle: Vehicle | null; reminders: ReminderWithStatus[] }[] = [];

  for (const [vehicleId, vehicleReminders] of vehicleMap) {
    const vehicle =
      vehicleId != null ? (vehicles.find((v) => v.vehicle_id === vehicleId) ?? null) : null;
    groups.push({ vehicle, reminders: vehicleReminders });
  }

  return groups.sort((a, b) => {
    if (a.vehicle === null) return 1;
    if (b.vehicle === null) return -1;
    return (a.vehicle.name ?? '').localeCompare(b.vehicle.name ?? '', 'fr');
  });
}

export default function UpcomingReminders({
  reminders,
  vehicles,
  currentUserId,
  onComplete,
  onEdit,
  onDelete,
  completingId,
  deletingId,
  showCompleted = false,
  onDeleteAttachment,
  deletingAttachmentId,
}: UpcomingRemindersProps) {
  if (reminders.length === 0) return null;

  const title = showCompleted ? `Terminés (${reminders.length})` : `À venir (${reminders.length})`;

  if (showCompleted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
            <CardTitle className="text-gray-500 dark:text-gray-400">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reminders.map((reminder) => {
              const vehicle = vehicles.find((v) => v.vehicle_id === reminder.vehicle_id) ?? null;
              return (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  vehicleName={vehicle?.name ?? undefined}
                  currentUserId={currentUserId}
                  canWrite={canWriteReminder(reminder, vehicle, currentUserId)}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isCompleting={completingId === reminder.id}
                  isDeleting={deletingId === reminder.id}
                  onDeleteAttachment={onDeleteAttachment}
                  deletingAttachmentId={deletingAttachmentId}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = groupByVehicle(reminders, vehicles);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groups.map(({ vehicle, reminders: groupReminders }) => (
            <div key={vehicle?.vehicle_id ?? 'no-vehicle'}>
              {vehicle && (
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {vehicle.name ?? `${vehicle.make} ${vehicle.model}`}
                </p>
              )}
              <div className="space-y-4">
                {groupReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    vehicleName={vehicle?.name ?? undefined}
                    currentUserId={currentUserId}
                    canWrite={canWriteReminder(reminder, vehicle, currentUserId)}
                    onComplete={onComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isCompleting={completingId === reminder.id}
                    isDeleting={deletingId === reminder.id}
                    onDeleteAttachment={onDeleteAttachment}
                    deletingAttachmentId={deletingAttachmentId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
