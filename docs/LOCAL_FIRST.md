# Local-First Architecture with Legend-State

## Overview

This guide explains how to implement local-first data persistence and Supabase synchronization using **Legend-State** in your Expo apps.

Legend-State replaces the traditional pattern of:

- Zustand (state management)
- expo-sqlite (local storage)
- Manual sync queue (offline changes)

With a single, unified system purpose-built for local-first Supabase apps.

---

## Why Legend-State?

| Traditional Approach                 | Legend-State                        |
| ------------------------------------ | ----------------------------------- |
| Zustand store + SQLite + manual sync | Single observable with auto-persist |
| 3+ packages to configure             | 1 package (@legendapp/state)        |
| Manual conflict resolution           | Built-in merge strategies           |
| Write sync logic yourself            | `syncedSupabase` plugin handles it  |

---

## Installation

```bash
pnpm add @legendapp/state @legendapp/persist @legendapp/sync-sdk-supabase expo-sqlite
```

---

## Core Concepts

### 1. Observable State

```typescript
import { observable, useObservable, useValue } from '@legendapp/state';

// Define reactive state
const state$ = observable({
  exercises: [] as Exercise[],
  programs: [] as Program[],
  userProgress: [] as ProgressEntry[],
});

// Read in components
function ExerciseList() {
  const exercises = useValue(state$.exercises);
  return (
    <FlatList
      data={exercises}
      renderItem={({ item }) => <ExerciseCard exercise={item} />}
    />
  );
}
```

### 2. Persistence

```typescript
import { persist } from '@legendapp/persist';
import { openDatabaseSync } from 'expo-sqlite';

// Persist to expo-sqlite
const db = openDatabaseSync('gtg-state.db');

const state$ = observable({
  exercises: persist<Exercise[]>([], {
    name: 'exercises',
    db: 'expo-sqlite',
  }),
  programs: persist<Program[]>([], {
    name: 'programs',
    db: 'expo-sqlite',
  }),
});
```

### 3. Supabase Sync

```typescript
import { syncedSupabase } from '@legendapp/sync-sdk-supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
);

// Sync table with Supabase
const syncExercises = syncedSupabase({
  supabase,
  tableName: 'exercises',
  select: '*',
  where: (row) => ({ user_id: row.user_id }),
  mapPrimary: (row) => row.id,
});

// Use in state
const state$ = observable({
  exercises: syncExercises,
});
```

---

## Complete Setup Example

### packages/state/src/config.ts

```typescript
import { observable, persist } from '@legendapp/state';
import { syncedSupabase } from '@legendapp/sync-sdk-supabase';
import { createClient } from '@supabase/supabase-js';
import { openDatabaseSync } from 'expo-sqlite';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
);

// Database for local persistence
const localDb = openDatabaseSync('gtg-local.db');

// Persistence config
const persistConfig = {
  db: 'expo-sqlite',
};

export const state$ = observable({
  // Local state with persistence
  exercises: persist<any[]>([], {
    ...persistConfig,
    name: 'exercises',
    dataInitial: [], // Default while loading
  }),

  programs: persist<any[]>([], {
    ...persistConfig,
    name: 'programs',
    dataInitial: [],
  }),

  workoutSessions: persist<any[]>([], {
    ...persistConfig,
    name: 'workout_sessions',
    dataInitial: [],
  }),

  progressLogs: persist<any[]>([], {
    ...persistConfig,
    name: 'progress_logs',
    dataInitial: [],
  }),

  // Sync status
  isSyncing: false,
  lastSyncedAt: null as string | null,
});

// Create synced observables for each table
export const syncExercises = syncedSupabase({
  supabase,
  tableName: 'exercises',
  select: '*',
  mapPrimary: (row) => row.id,
});

export const syncPrograms = syncedSupabase({
  supabase,
  tableName: 'programs',
  select: '*',
  mapPrimary: (row) => row.id,
});

export const syncWorkoutSessions = syncedSupabase({
  supabase,
  tableName: 'workout_sessions',
  select: '*',
  mapPrimary: (row) => row.id,
});
```

### packages/state/src/index.ts

```typescript
export { observable, useObservable, useValue } from '@legendapp/state';
export { persist } from '@legendapp/persist';
export { syncedSupabase } from '@legendapp/sync-sdk-supabase';
export { state$, syncExercises, syncPrograms, syncWorkoutSessions, supabase } from './config';
```

---

## Usage in Components

### Reading State

```typescript
import { state$, syncExercises } from '@company/state';
import { useValue } from '@legendapp/state';

function ExercisesScreen() {
  // Subscribe to local state
  const exercises = useValue(state$.exercises);
  const isLoading = useValue(state$.isLoading);

  return (
    <View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList data={exercises} renderItem={({ item }) => <ExerciseCard item={item} />} />
      )}
    </View>
  );
}
```

### Writing State (Optimistic Updates)

```typescript
import { state$ } from '@company/state';

function addExercise(exercise: Exercise) {
  // Update local state immediately
  state$.exercises.set([...state$.exercises.get(), exercise]);

  // Supabase sync happens in background
  // If sync fails, state automatically rolls back
}

function updateExercise(id: string, updates: Partial<Exercise>) {
  state$.exercises.set((exercises) =>
    exercises.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex)),
  );
}

function deleteExercise(id: string) {
  state$.exercises.set((exercises) => exercises.filter((ex) => ex.id !== id));
}
```

### Syncing with Supabase

```typescript
import { syncExercises } from '@company/state';

// Initial sync when user signs in
async function syncFromServer() {
  state$.isSyncing.set(true);

  try {
    await syncExercises.syncToLocal();
    state$.lastSyncedAt.set(new Date().toISOString());
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    state$.isSyncing.set(false);
  }
}

// Push local changes to server
async function pushToServer() {
  state$.isSyncing.set(true);

  try {
    await syncExercises.syncToServer();
  } catch (error) {
    console.error('Push failed:', error);
  } finally {
    state$.isSyncing.set(false);
  }
}
```

---

## Offline-First Behavior

With Legend-State, the flow is:

1. **User makes change** → State updates immediately (optimistic)
2. **Change persisted locally** → Available offline
3. **Change queued for sync** → Synced when online
4. **Conflict resolution** → Last-write-wins or custom merge

```typescript
// Offline: Changes persist locally
const exercise = { id: '1', name: 'Push-ups', reps: 10 };
addExercise(exercise); // Works offline

// When back online: Auto-sync
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    syncExercises.syncToServer();
    syncExercises.syncToLocal();
  }
});
```

---

## Sync Configuration Options

```typescript
const syncConfig = syncedSupabase({
  supabase,
  tableName: 'exercises',
  select: '*',

  // Primary key mapping
  mapPrimary: (row) => row.id,

  // Filter rows (e.g., user's data only)
  where: (row) => ({ user_id: row.user_id }),

  // Conflict resolution
  onConflict: 'last-write-wins', // or 'server-wins' or 'local-wins'

  // Batch size for large syncs
  batchSize: 100,

  // Retry on failure
  retryAttempts: 3,
  retryDelay: 1000,
});
```

---

## TypeScript Types

Define your data types once:

```typescript
// types/exercise.ts
export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  description: string;
  muscle_groups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  default_reps: number;
  default_sets: number;
  instructions: string[];
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

// Use in state
const state$ = observable({
  exercises: persist<Exercise[]>([], { name: 'exercises' }),
});
```

---

## Migration from Existing Storage

If you have existing data in SQLite:

```typescript
import * as SQLite from 'expo-sqlite';

async function migrateFromLegacy() {
  const db = await SQLite.openDatabaseAsync('legacy.db');

  // Read existing data
  const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises');

  // Migrate to Legend-State
  state$.exercises.set(rows);

  // Clean up old database
  await db.closeAsync();
}
```

---

## Testing

```typescript
import { observable } from '@legendapp/state';

describe('Exercise State', () => {
  const testState$ = observable({
    exercises: [] as Exercise[],
  });

  it('should add exercise', () => {
    const exercise = { id: '1', name: 'Push-ups' };
    testState$.exercises.set([exercise]);
    expect(testState$.exercises.get()).toEqual([exercise]);
  });

  it('should update exercise', () => {
    testState$.exercises.set((exs) => exs.map((ex) => (ex.id === '1' ? { ...ex, reps: 15 } : ex)));
    expect(testState$.exercises.get()[0].reps).toBe(15);
  });
});
```

---

## Related Documents

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system design
- [SUPABASE_MIGRATIONS.md](../database/SUPABASE_MIGRATIONS.md) - Database migration workflow
- [AUTH_SETUP.md](../auth/AUTH_SETUP.md) - Authentication with Supabase
