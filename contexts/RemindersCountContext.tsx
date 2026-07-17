'use client';

import { createContext, useContext } from 'react';

import type { ReactNode } from 'react';

interface RemindersCountContextType {
  overdue: number;
  dueSoon: number;
}

const RemindersCountContext = createContext<RemindersCountContextType>({ overdue: 0, dueSoon: 0 });

export function RemindersCountProvider({
  overdue,
  dueSoon,
  children,
}: RemindersCountContextType & { children: ReactNode }) {
  return (
    <RemindersCountContext.Provider value={{ overdue, dueSoon }}>
      {children}
    </RemindersCountContext.Provider>
  );
}

export function useRemindersCount(): RemindersCountContextType {
  return useContext(RemindersCountContext);
}
