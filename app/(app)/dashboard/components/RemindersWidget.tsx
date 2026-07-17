'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import ReminderStatusBadge from '@/app/(app)/reminders/components/ReminderStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/ui/card';
import Icon from '@/components/common/ui/Icon';
import { enrichReminder, formatReminderDue, sortReminders } from '@/lib/utils/reminderUtils';

import type { Expense } from '@/types/expense';
import type { Reminder } from '@/types/reminder';
import type { Vehicle } from '@/types/vehicle';

interface RemindersWidgetProps {
  reminders: Reminder[];
  vehicles: Vehicle[];
  fillExpenses: Expense[];
}

export default function RemindersWidget({
  reminders,
  vehicles,
  fillExpenses,
}: RemindersWidgetProps) {
  const enriched = useMemo(() => {
    const active = reminders.filter((r) => !r.is_completed);
    const withStatus = active.map((r) => {
      const vehicle =
        r.vehicle_id != null ? (vehicles.find((v) => v.vehicle_id === r.vehicle_id) ?? null) : null;
      return enrichReminder(r, vehicle as Vehicle | null, fillExpenses);
    });
    return sortReminders(withStatus);
  }, [reminders, vehicles, fillExpenses]);

  const overdue = useMemo(() => enriched.filter((r) => r.status === 'overdue'), [enriched]);
  const upcoming = useMemo(
    () => enriched.filter((r) => r.status !== 'overdue').slice(0, 3),
    [enriched],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="bell" size={18} />
          <CardTitle>Rappels</CardTitle>
          {overdue.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
              {overdue.length}
            </span>
          )}
        </div>
        <Link href="/reminders" className="text-sm font-medium text-custom-1 hover:underline">
          Voir tout
        </Link>
      </CardHeader>

      <CardContent>
        {enriched.length === 0 ? (
          <div className="py-8 text-center">
            <Icon name="bell" size={32} className="opacity-20 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Aucun rappel actif</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Overdue alert */}
            {overdue.length > 0 && (
              <Link href="/reminders" className="block">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    {overdue.length} rappel{overdue.length > 1 ? 's' : ''} en retard
                  </p>
                </div>
              </Link>
            )}

            {/* Upcoming list */}
            {upcoming.map((reminder) => {
              const vehicle = vehicles.find((v) => v.vehicle_id === reminder.vehicle_id);
              return (
                <div
                  key={reminder.id}
                  className="flex items-start justify-between gap-2 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {reminder.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {vehicle?.name ? `${vehicle.name} · ` : ''}
                      {formatReminderDue(reminder)}
                    </p>
                  </div>
                  <ReminderStatusBadge status={reminder.status} className="shrink-0" />
                </div>
              );
            })}

            {enriched.length > upcoming.length + overdue.length && (
              <Link
                href="/reminders"
                className="block text-xs text-gray-400 dark:text-gray-500 hover:text-custom-2 dark:hover:text-custom-2 text-center pt-1 transition-colors"
              >
                +{enriched.length - upcoming.length - overdue.length} autres rappels
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
