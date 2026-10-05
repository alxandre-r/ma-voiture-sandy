'use client';

import ReminderCard from '@/app/(app)/reminders/components/ReminderCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import { canWriteReminder } from '@/lib/utils/reminderUtils';

import type { ReminderWithStatus } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

interface OverdueRemindersProps {
  reminders: ReminderWithStatus[];
  vehicles: Vehicle[];
  currentUserId?: string;
  onComplete: (id: number, completed: boolean) => void;
  onEdit: (reminder: ReminderWithStatus) => void;
  onDelete: (id: number) => void;
  completingId: number | null;
  deletingId: number | null;
  onDeleteAttachment?: (attachmentId: number) => void;
  deletingAttachmentId?: number | null;
}

export default function OverdueReminders({
  reminders,
  vehicles,
  currentUserId,
  onComplete,
  onEdit,
  onDelete,
  completingId,
  deletingId,
  onDeleteAttachment,
  deletingAttachmentId,
}: OverdueRemindersProps) {
  if (reminders.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <CardTitle className="text-red-600 dark:text-red-400">
            En retard ({reminders.length})
          </CardTitle>
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
