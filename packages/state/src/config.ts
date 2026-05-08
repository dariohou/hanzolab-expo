import { observable } from '@legendapp/state';

export interface PersistedData<T> {
  data: T;
  updatedAt?: string;
}

export function createPersistedObservable<T>(initialValue: T, _name: string) {
  return observable(initialValue);
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
