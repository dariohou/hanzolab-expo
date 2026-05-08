import { observable, persist } from '@legendapp/state';
import { openDatabaseSync } from 'expo-sqlite';
import type { Observable } from '@legendapp/state';

const localDb = openDatabaseSync('hanzolab-local.db');

const persistConfig = {
  db: 'expo-sqlite' as const,
};

export interface PersistedData<T> {
  data: T;
  updatedAt?: string;
}

export function createPersistedObservable<T>(initialValue: T, name: string): Observable<T> {
  return observable(
    persist<T>(initialValue, {
      ...persistConfig,
      name,
      dataInitial: initialValue,
    }),
  );
}

export const exercises$ = createPersistedObservable<any[]>([], 'exercises');
export const programs$ = createPersistedObservable<any[]>([], 'programs');
export const workoutSessions$ = createPersistedObservable<any[]>([], 'workout_sessions');
export const isLoading$ = observable(false);
export const isSyncing$ = observable(false);
export const lastSyncedAt$ = observable<string | null>(null);

export const state$ = {
  exercises: exercises$,
  programs: programs$,
  workoutSessions: workoutSessions$,
  isLoading: isLoading$,
  isSyncing: isSyncing$,
  lastSyncedAt: lastSyncedAt$,
};
