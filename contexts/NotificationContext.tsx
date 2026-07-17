'use client';

import { createContext, useContext, useState } from 'react';

import NotificationModal from '@/components/common/ui/NotificationModal';

import type { ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  action?: NotificationAction;
}

interface NotificationContextType {
  showNotification: (
    message: string,
    type: NotificationType,
    duration?: number,
    action?: NotificationAction,
  ) => void;
  showSuccess: (message: string, duration?: number, action?: NotificationAction) => void;
  showError: (message: string, duration?: number, action?: NotificationAction) => void;
  showInfo: (message: string, duration?: number, action?: NotificationAction) => void;
  showWarning: (message: string, duration?: number, action?: NotificationAction) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const showNotification = (
    message: string,
    type: NotificationType,
    duration = 6000,
    action?: NotificationAction,
  ) => {
    setNotifications((prev) => [
      ...prev,
      { id: crypto.randomUUID(), message, type, duration, action },
    ]);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess: (msg, dur, action) => showNotification(msg, 'success', dur, action),
        showError: (msg, dur, action) => showNotification(msg, 'error', dur, action),
        showInfo: (msg, dur, action) => showNotification(msg, 'info', dur, action),
        showWarning: (msg, dur, action) => showNotification(msg, 'warning', dur, action),
      }}
    >
      {children}

      {/* Notification stack container */}
      <div className="fixed bottom-20 right-0 z-[70] flex flex-col gap-3 px-2 md:bottom-auto md:top-4 md:px-6 md:max-w-lg w-full">
        {notifications.map((n) => (
          <NotificationModal
            key={n.id}
            message={n.message}
            type={n.type}
            duration={n.duration}
            action={n.action}
            onClose={() => removeNotification(n.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
