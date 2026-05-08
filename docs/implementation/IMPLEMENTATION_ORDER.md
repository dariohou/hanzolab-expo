# Implementation Order - Foundation Before Apps

## Overview

This guide defines the implementation order for building all three apps. The strategy is to build shared infrastructure first, then implement apps sequentially to maximize code sharing and learning.

---

## Phase 1: Foundation Setup (Weeks 1-2)

### Step 1.1: Initialize Monorepo

```bash
# Create project structure
mkdir -p expo-research
cd expo-research

# Initialize npm
npm init -y

# Create directory structure
mkdir -p apps/qigong apps/walking apps/gtg
mkdir -p packages/ui packages/timer-core
mkdir -p packages/auth packages/utils
mkdir -p infrastructure/supabase/docker infrastructure/supabase/migrations
mkdir -p docs/setup docs/implementation docs/database docs/auth

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "expo-research",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean",
    "typecheck": "turbo typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "prettier": "^3.3.0",
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
EOF

# Create pnpm workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create .npmrc
echo 'node-linker=hoisted' > .npmrc
```

### Step 1.2: Create Turborepo Config

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".expo/**", ".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF
```

### Step 1.3: Create TypeScript Base Config

```bash
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-native",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "exclude": ["node_modules", "dist", ".expo", ".turbo"]
}
EOF
```

### Step 1.4: Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm@9

# Install dependencies
pnpm install
```

### Step 1.5: Initialize Git

```bash
git init
git add .
git commit -m "Initial monorepo setup"
```

---

## Phase 2: Shared Packages (Weeks 2-3)

### Step 2.1: Create UI Package

```bash
cat > packages/ui/package.json << 'EOF'
{
  "name": "@company/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "dependencies": {
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^3.35.0",
    "expo-linear-gradient": "~13.0.0",
    "nativewind": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0"
  }
}
EOF

cat > packages/ui/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
EOF

mkdir -p packages/ui/src/components
cat > packages/ui/src/components/Button.tsx << 'EOF'
import React from 'react';
import { TouchableOpacity, Text, type ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  style,
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-semibold transition-colors';

  const variantStyles = {
    primary: 'bg-primary active:bg-primary/80',
    secondary: 'bg-secondary active:bg-secondary/80',
    outline: 'border-2 border-primary bg-transparent',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const textColor = variant === 'outline' ? 'text-primary' : 'text-white';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
      style={style}
      activeOpacity={0.8}
    >
      <Text className={`${textColor} text-center`}>{title}</Text>
    </TouchableOpacity>
  );
}
EOF

cat > packages/ui/src/components/Card.tsx << 'EOF'
import React from 'react';
import { View, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <View className={`bg-gray-900 rounded-xl p-4 ${className}`} style={style}>
      {children}
    </View>
  );
}
EOF

cat > packages/ui/src/components/Input.tsx << 'EOF'
import React from 'react';
import { TextInput, View, Text, type TextInputProps, type ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  inputStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerClassName = '',
  inputStyle,
  className = '',
  ...props
}: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && <Text className="text-gray-300 mb-1 text-sm">{label}</Text>}
      <TextInput
        className={`bg-gray-800 text-white px-4 py-3 rounded-lg border ${error ? 'border-red-500' : 'border-gray-700'} ${className}`}
        placeholderTextColor="#6b7280"
        style={inputStyle}
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
EOF

cat > packages/ui/src/components/ProgressBar.tsx << 'EOF'
import React from 'react';
import { View, type ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  style?: ViewStyle;
  barClassName?: string;
}

export function ProgressBar({
  progress,
  className = '',
  style,
  barClassName = ''
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View className={`bg-gray-800 rounded-full h-2 overflow-hidden ${className}`} style={style}>
      <View
        className={`bg-primary h-full rounded-full transition-all ${barClassName}`}
        style={{ width: `${clampedProgress}%` }}
      />
    </View>
  );
}
EOF

cat > packages/ui/src/components/index.ts << 'EOF'
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { ProgressBar } from './ProgressBar';
EOF

cat > packages/ui/src/index.ts << 'EOF'
export * from './components';
export { theme } from './theme';
EOF

mkdir -p packages/ui/src/theme
cat > packages/ui/src/theme/index.ts << 'EOF'
export const theme = {
  colors: {
    background: '#1a1a1a',
    surface: '#262626',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;
EOF
```

### Step 2.2: Create Timer Core Package

```bash
cat > packages/timer-core/package.json << 'EOF'
{
  "name": "@company/timer-core",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.3.0"
  },
  "dependencies": {
    "react-native-reanimated": "~3.16.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
EOF

cat > packages/timer-core/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
EOF

mkdir -p packages/timer-core/src

cat > packages/timer-core/src/types.ts << 'EOF'
export interface TimerConfig {
  duration: number; // total seconds
  restDuration?: number;
  intervals?: number;
  autoStart?: boolean;
  soundEnabled?: boolean;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  currentInterval: number;
  totalIntervals: number;
}

export type TimerAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'COMPLETE' }
  | { type: 'INTERVAL_COMPLETE' };

export interface UseTimerReturn {
  state: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formattedTime: string;
  progress: number;
}
EOF

cat > packages/timer-core/src/useTimer.ts << 'EOF'
import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { TimerConfig, TimerState, TimerAction, UseTimerReturn } from './types';

const initialState: TimerState = {
  isRunning: false,
  isPaused: false,
  remainingSeconds: 0,
  elapsedSeconds: 0,
  currentInterval: 1,
  totalIntervals: 1,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isRunning: true,
        isPaused: false,
      };
    case 'PAUSE':
      return {
        ...state,
        isPaused: true,
      };
    case 'RESUME':
      return {
        ...state,
        isPaused: false,
      };
    case 'RESET':
      return initialState;
    case 'TICK':
      return {
        ...state,
        remainingSeconds: Math.max(0, state.remainingSeconds - 1),
        elapsedSeconds: state.elapsedSeconds + 1,
      };
    case 'INTERVAL_COMPLETE':
      return {
        ...state,
        currentInterval: state.currentInterval + 1,
        remainingSeconds: 0,
      };
    case 'COMPLETE':
      return {
        ...state,
        isRunning: false,
        remainingSeconds: 0,
      };
    default:
      return state;
  }
}

export function useTimer(config: TimerConfig): UseTimerReturn {
  const [state, dispatch] = useReducer(timerReducer, {
    ...initialState,
    remainingSeconds: config.duration,
    totalIntervals: config.intervals ?? 1,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused]);

  useEffect(() => {
    if (state.remainingSeconds === 0 && state.isRunning) {
      if (state.currentInterval < state.totalIntervals) {
        dispatch({ type: 'INTERVAL_COMPLETE' });
        // Auto-start next interval if configured
        if (configRef.current.autoStart) {
          // Would need to set remainingSeconds to rest duration here
        }
      } else {
        dispatch({ type: 'COMPLETE' });
      }
    }
  }, [state.remainingSeconds, state.isRunning, state.currentInterval, state.totalIntervals]);

  const start = useCallback(() => {
    dispatch({ type: 'START' });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = config.duration > 0
    ? ((config.duration - state.remainingSeconds) / config.duration) * 100
    : 0;

  return {
    state,
    start,
    pause,
    resume,
    reset,
    formattedTime: formatTime(state.remainingSeconds),
    progress,
  };
}
EOF

cat > packages/timer-core/src/index.ts << 'EOF'
export * from './types';
export { useTimer } from './useTimer';
EOF
```

### Step 2.4: Create Auth Package

```bash
cat > packages/auth/package.json << 'EOF'
{
  "name": "@company/auth",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@react-native-async-storage/async-storage": "^2.0.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
EOF

cat > packages/auth/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
EOF

mkdir -p packages/auth/src/providers
mkdir -p packages/auth/src/hooks
mkdir -p packages/auth/src/context

cat > packages/auth/src/client.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Basic client for shared auth operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App-specific client factory
export function createAppClient(appId: 'qigong' | 'walking' | 'gtg') {
  const keyMap: Record<string, string> = {
    qigong: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_QIGONG ?? SUPABASE_ANON_KEY,
    walking: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_WALKING ?? SUPABASE_ANON_KEY,
    gtg: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_GTG ?? SUPABASE_ANON_KEY,
  };
  return createClient(SUPABASE_URL, keyMap[appId] ?? SUPABASE_ANON_KEY);
}
EOF

cat > packages/auth/src/types.ts << 'EOF'
import type { Session, User } from '@supabase/supabase-js';

export type AppId = 'qigong' | 'walking' | 'gtg';

export interface AuthUser extends User {
  app_id: AppId;
}

export interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
EOF

cat > packages/auth/src/context/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../client';
import type { AuthState, AuthUser, AppId } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children, appId }: { children: ReactNode; appId: AppId }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const userWithAppId = {
            ...session.user,
            app_id: appId,
          } as AuthUser;

          setState({
            session,
            user: userWithAppId,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userWithAppId = {
            ...session.user,
            app_id: appId,
          } as AuthUser;

          setState({
            session,
            user: userWithAppId,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [appId]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { app_id: appId } },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [appId]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
EOF

cat > packages/auth/src/index.ts << 'EOF'
export { supabase, createAppClient } from './client';
export { AuthProvider, useAuth } from './context/AuthContext';
export type { AppId, AuthUser, AuthState } from './types';
EOF
```

### Step 2.5: Create State Management with Legend-State

Legend-State handles local persistence and Supabase sync in one unified system. This replaces the traditional Zustand + SQLite + manual sync pattern.

```bash
cat > packages/state/package.json << 'EOF'
{
  "name": "@company/state",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@legendapp/state": "@beta",
    "@legendapp/persist": "latest",
    "expo-sqlite": "~14.0.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
EOF

cat > packages/state/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
EOF

mkdir -p packages/state/src

cat > packages/state/src/index.ts << 'EOF'
export { observable, useObservable, useValue } from '@legendapp/state';
export { persist } from '@legendapp/persist';
export { syncedSupabase } from '@legendapp/sync-sdk-supabase';
EOF

cat > packages/state/src/config.ts << 'EOF'
import { observable, persist } from '@legendapp/state';
import { syncedSupabase } from '@legendapp/sync-sdk-supabase';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for sync
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

// Configure persistence with expo-sqlite
const persistConfig = {
  name: 'gtg-state', // database name
  db: 'expo-sqlite',
};

// Configure Supabase sync plugin
export function createSyncedTable<T extends Record<string, unknown>>(
  tableName: string,
  selectQuery: string = '*'
) {
  return syncedSupabase({
    supabase,
    tableName,
    select: selectQuery,
    persist: persistConfig,
    // Maps Supabase row to local state shape
    mapPrimary: (row) => row.id as string,
  });
}

// App state observable with persistence
export const state$ = observable({
  // Local exercises (synced from Supabase)
  exercises: persist<any[]>([], {
    ...persistConfig,
    // Initial data while loading from Supabase
    dataInitial: [],
  }),

  // User's workout sessions
  workoutSessions: persist<any[]>([], persistConfig),

  // User's programs
  programs: persist<any[]>([], persistConfig),

  // Progress logs
  progressLogs: persist<any[]>([], persistConfig),

  // Loading states
  isLoading: false,
  isSyncing: false,
  lastSyncedAt: null as string | null,
});

export { supabase };
EOF
```

### Step 2.6: Create Utils Package

```bash
cat > packages/utils/package.json << 'EOF'
{
  "name": "@company/utils",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/**/*.ts*",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
EOF

cat > packages/utils/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
EOF

mkdir -p packages/utils/src

cat > packages/utils/src/formatters.ts << 'EOF'
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}
EOF

cat > packages/utils/src/validators.ts << 'EOF'
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { valid: errors.length === 0, errors };
}

export function generateShareCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
EOF

cat > packages/utils/src/index.ts << 'EOF'
export * from './formatters';
export * from './validators';
EOF
```

---

## Phase 3: First App - GTG (Weeks 3-4)

### Step 3.1: Initialize GTG App

```bash
cat > apps/gtg/package.json << 'EOF'
{
  "name": "@company/gtg",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build": "expo build",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint app/**/*.tsx src/**/*.ts*",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "^18.3.0",
    "react-native": "^0.76.0",
    "@legendapp/state": "@beta",
    "@company/ui": "workspace:*",
    "@company/timer-core": "workspace:*",
    "@company/auth": "workspace:*",
    "@company/state": "workspace:*",
    "@company/utils": "workspace:*"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.5.0",
    "expo-dev-client": "~4.0.0"
  }
}
EOF
```

### Step 3.2: Create App Configs

```bash
cat > apps/gtg/app.json << 'EOF'
{
  "expo": {
    "name": "GTG",
    "slug": "gtg",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "gtg",
    "userInterfaceStyle": "automatic",
    "splash": {
      "backgroundColor": "#1a1a1a",
      "resizeMode": "contain"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.gtg",
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "remote-notification"]
      }
    },
    "android": {
      "package": "com.yourcompany.gtg",
      "adaptiveIcon": {
        "backgroundColor": "#1a1a1a"
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "ios": { "newArchEnabled": true },
          "android": { "newArchEnabled": true }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
EOF

cat > apps/gtg/eas.json << 'EOF'
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
EOF

cat > apps/gtg/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@company/ui": ["../../packages/ui/src"],
      "@company/timer-core": ["../../packages/timer-core/src"],
      "@company/auth": ["../../packages/auth/src"],
      "@company/state": ["../../packages/state/src"],
      "@company/utils": ["../../packages/utils/src"]
    }
  },
  "include": ["app/**/*", "src/**/*", "*.ts", "*.tsx"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > apps/gtg/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        surface: '#262626',
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        text: '#ffffff',
        'text-secondary': '#9ca3af',
        border: '#374151',
      },
    },
  },
  plugins: [],
};
EOF

cat > apps/gtg/babel.config.js << 'EOF'
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    'nativewind/babel',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
    'react-native-reanimated/plugin',
  ].filter(Boolean),
};
EOF

cat > apps/gtg/nativewind-env.d.ts << 'EOF'
/// <reference types="nativewind/types" />
EOF
```

### Step 3.3: Create App Routes

```bash
mkdir -p apps/gtg/app
mkdir -p apps/gtg/app/exercises
mkdir -p apps/gtg/app/programs
mkdir -p apps/gtg/app/settings
mkdir -p apps/gtg/app/auth
mkdir -p apps/gtg/src/components
mkdir -p apps/gtg/src/stores
mkdir -p apps/gtg/src/hooks

cat > apps/gtg/app/_layout.tsx << 'EOF'
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { AuthProvider } from '@company/auth';
import { NativeWindProvider } from 'nativewind';

export default function RootLayout() {
  return (
    <NativeWindProvider>
      <AuthProvider appId="gtg">
        <View className="flex-1 bg-background">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1a1a1a' },
            }}
          />
        </View>
      </AuthProvider>
    </NativeWindProvider>
  );
}
EOF

cat > apps/gtg/app/index.tsx << 'EOF'
import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Button, Card } from '@company/ui';
import { useAuth } from '@company/auth';
import { state$ } from '@company/state';
import { useValue } from '@legendapp/state';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const exercises = useValue(state$.exercises);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-12">
        <Text className="text-4xl font-bold text-white mb-2">GTG</Text>
        <Text className="text-text-secondary text-lg mb-8">
          Greasing the Groove - Build Strength Through Frequency
        </Text>

        {!isAuthenticated ? (
          <View className="gap-4">
            <Link href="/auth/login" asChild>
              <Button title="Sign In" variant="primary" />
            </Link>
            <Link href="/auth/signup" asChild>
              <Button title="Create Account" variant="outline" />
            </Link>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-white mb-2">Welcome back!</Text>

            <Card>
              <Text className="text-xl font-semibold text-white mb-2">
                Today's Workout
              </Text>
              <Text className="text-text-secondary mb-4">
                {exercises.length} exercises available
              </Text>
              <Link href="/exercises" asChild>
                <Button title="Start Workout" variant="primary" />
              </Link>
            </Card>

            <Link href="/exercises" asChild>
              <Button title="Browse Exercises" variant="secondary" />
            </Link>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
EOF

cat > apps/gtg/app/exercises/index.tsx << 'EOF'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Card } from '@company/ui';
import { state$ } from '@company/state';
import { useValue } from '@legendapp/state';

export default function ExercisesIndex() {
  const exercises = useValue(state$.exercises);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-8">
        <Text className="text-3xl font-bold text-white mb-6">Exercises</Text>

        <View className="gap-4">
          {exercises.map((exercise) => (
            <Link key={exercise.id} href={`/exercises/${exercise.id}`} asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Card className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white">
                      {exercise.name}
                    </Text>
                    <Text className="text-text-secondary text-sm">
                      {exercise.muscleGroups?.join(', ')}
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                      <View className={`px-2 py-1 rounded ${getDifficultyColor(exercise.difficulty)}`}>
                        <Text className="text-xs text-white">{exercise.difficulty}</Text>
                      </View>
                      <Text className="text-text-secondary text-sm">
                        {exercise.defaultReps} reps
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary">→</Text>
                </Card>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'beginner': return 'bg-green-600';
    case 'intermediate': return 'bg-yellow-600';
    case 'advanced': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
}
EOF

cat > apps/gtg/app/exercises/[id].tsx << 'EOF'
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Button, Card } from '@company/ui';
import { useTimer } from '@company/timer-core';
import { state$ } from '@company/state';
import { useValue } from '@legendapp/state';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercises = useValue(state$.exercises);
  const exercise = exercises.find((e) => e.id === id);

  const timerConfig = {
    duration: (exercise?.defaultReps ?? 10) * 3,
    autoStart: false,
  };

  const timer = useTimer(timerConfig);

  if (!exercise) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-white">Exercise not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise.name, headerShown: true }} />
      <ScrollView className="flex-1 bg-background">
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-white mb-4">{exercise.name}</Text>

          <Card className="mb-6">
            <Text className="text-text-secondary mb-2">Muscle Groups</Text>
            <Text className="text-white">{exercise.muscleGroups?.join(', ')}</Text>
          </Card>

          <Card className="mb-6">
            <Text className="text-text-secondary mb-2">Instructions</Text>
            {exercise.instructions?.map((instruction, i) => (
              <View key={i} className="flex-row mb-2">
                <Text className="text-primary mr-2">{i + 1}.</Text>
                <Text className="text-white flex-1">{instruction}</Text>
              </View>
            ))}
          </Card>

          <Card className="mb-6 items-center">
            <Text className="text-6xl font-bold text-white mb-4">
              {timer.formattedTime}
            </Text>
            <View className="w-full bg-gray-800 rounded-full h-3 mb-4">
              <View
                className="bg-primary h-3 rounded-full"
                style={{ width: `${timer.progress}%` }}
              />
            </View>
            <View className="flex-row gap-4">
              {!timer.state.isRunning ? (
                <Button
                  title="Start"
                  onPress={timer.start}
                  variant="primary"
                />
              ) : timer.state.isPaused ? (
                <Button
                  title="Resume"
                  onPress={timer.resume}
                  variant="primary"
                />
              ) : (
                <Button
                  title="Pause"
                  onPress={timer.pause}
                  variant="secondary"
                />
              )}
              <Button
                title="Reset"
                onPress={timer.reset}
                variant="outline"
              />
            </View>
          </Card>

          <Card>
            <Text className="text-text-secondary mb-2">Recommended</Text>
            <Text className="text-white text-lg">
              {exercise.defaultSets} sets × {exercise.defaultReps} reps
            </Text>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
EOF

cat > apps/gtg/app/programs/index.tsx << 'EOF'
import { View, Text } from 'react-native';

export default function ProgramsIndex() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-white">Programs coming soon</Text>
    </View>
  );
}
EOF

cat > apps/gtg/app/settings/index.tsx << 'EOF'
import { View, Text } from 'react-native';
import { useAuth } from '@company/auth';
import { Button } from '@company/ui';

export default function Settings() {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View className="flex-1 bg-background px-6 py-8">
      <Text className="text-3xl font-bold text-white mb-6">Settings</Text>

      <View className="gap-4">
        <View>
          <Text className="text-text-secondary text-sm">Email</Text>
          <Text className="text-white text-lg">{user?.email ?? 'Not signed in'}</Text>
        </View>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          className="mt-4"
        />
      </View>
    </View>
  );
}
EOF

cat > apps/gtg/app/auth/login.tsx << 'EOF'
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, Input } from '@company/ui';
import { useAuth } from '@company/auth';
import { isValidEmail } from '@company/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError.message);
    }

    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-background px-6 py-12 justify-center">
      <Text className="text-3xl font-bold text-white mb-8">Sign In</Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={error && !email ? 'Email is required' : undefined}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        error={error && !password ? 'Password is required' : undefined}
      />

      {error && <Text className="text-red-500 mb-4">{error}</Text>}

      <Button
        title="Sign In"
        onPress={handleLogin}
        variant="primary"
        disabled={isLoading}
      />

      <Link href="/auth/signup" className="mt-4">
        <Text className="text-primary text-center">
          Don't have an account? Sign Up
        </Text>
      </Link>
    </View>
  );
}
EOF

cat > apps/gtg/app/auth/signup.tsx << 'EOF'
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, Input } from '@company/ui';
import { useAuth } from '@company/auth';
import { isValidEmail, isValidPassword } from '@company/utils';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: authError } = await signUp(email, password);

    if (authError) {
      setError(authError.message);
    }

    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-background px-6 py-12 justify-center">
      <Text className="text-3xl font-bold text-white mb-8">Create Account</Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      {error && <Text className="text-red-500 mb-4">{error}</Text>}

      <Button
        title="Create Account"
        onPress={handleSignUp}
        variant="primary"
        disabled={isLoading}
      />

      <Link href="/auth/login" className="mt-4">
        <Text className="text-primary text-center">
          Already have an account? Sign In
        </Text>
      </Link>
    </View>
  );
}
EOF
```

---

## Phase 4: CI/CD Setup (Week 4)

### Step 4.1: Create GitHub Actions Workflows

```bash
mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint and Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck all packages
        run: pnpm typecheck

      - name: Lint all packages
        run: pnpm lint

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Test all packages
        run: pnpm test

  build-apps:
    name: Build Apps
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    strategy:
      fail-fast: false
      matrix:
        app: [gtg] # Add qigong, walking after they're created
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.app }}
        run: pnpm --filter @company/${{ matrix.app }} build
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
EOF

cat > .github/workflows/build-local.yml << 'EOF'
name: Local Build

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App to build'
        required: true
        type: choice
        options:
          - gtg
          - qigong
          - walking
      platform:
        description: 'Platform'
        required: true
        type: choice
        options:
          - ios
          - android
          - all

jobs:
  build-ios:
    name: Build iOS
    runs-on: macos-latest
    if: inputs.platform == 'ios' || inputs.platform == 'all'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest

      - name: Install Apple certs
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          echo "$APPLE_CERTIFICATE" | base64 -d > certificate.p12
          security import certificate.p12 -P "$APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k /Library/Keychains/system.keychain

      - name: Build iOS
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform ios --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  build-android:
    name: Build Android
    runs-on: ubuntu-latest
    if: inputs.platform == 'android' || inputs.platform == 'all'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Build Android
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform android --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
EOF
```

---

## Phase 5: Walking & Qigong Apps (Weeks 5-8, 9-14)

Once GTG app is complete and working, repeat similar steps to create:

- `apps/walking` with map integration and photo sharing
- `apps/qigong` with Lottie animations and program builder

---

## Next Steps After Setup

1. **Test monorepo structure:**

   ```bash
   pnpm typecheck
   pnpm lint
   ```

2. **Set up Supabase on VPS** (see `docs/setup/infrastructure/SUPABASE_SETUP.md`)

3. **Create .env files** in each app:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run development:**

   ```bash
   pnpm --filter @company/gtg dev
   ```

5. **Test build:**
   ```bash
   pnpm --filter @company/gtg build
   ```
