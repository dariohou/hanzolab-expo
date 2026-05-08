# Authentication Implementation

## Overview

This document covers authentication implementation across all three apps using Supabase Auth with focus on Apple Sign In and future payment integration.

---

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Mobile Apps                                  │
│                                                                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│   │   Qigong    │  │   Walking   │  │     GTG     │                  │
│   │   @company/auth   │  @company/auth   │  @company/auth   │                  │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│          │                │                │                         │
│          ▼                ▼                ▼                         │
│   ┌─────────────────────────────────────────────────────┐           │
│   │              Supabase Auth (self-hosted)            │           │
│   │                                                        │           │
│   │   • Email/Password                                     │           │
│   │   • Apple Sign In                                      │           │
│   │   • Google Sign In                                     │           │
│   │   • Magic Link                                         │           │
│   │   • Session Management                                 │           │
│   └─────────────────────────────────────────────────────┘           │
│                            │                                          │
└────────────────────────────│──────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                               │
│                                                                       │
│   auth.users (with app_id)                                           │
│   auth.sessions                                                      │
│   auth.mfa_enrollments                                               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Auth Package Structure

### `@company/auth` Package

```
packages/auth/
├── src/
│   ├── client.ts           # Supabase client initialization
│   ├── providers/
│   │   ├── Apple.tsx       # Apple Sign In component
│   │   ├── Google.tsx      # Google Sign In component
│   │   └── Email.tsx       # Email/password auth
│   ├── hooks/
│   │   ├── useAuth.ts      # Main auth hook
│   │   ├── useSession.ts   # Session management hook
│   │   ├── useUser.ts      # User data hook
│   │   └── useSignOut.ts   # Sign out helper
│   ├── context/
│   │   └── AuthContext.tsx # React Context for auth state
│   ├── types.ts            # TypeScript definitions
│   └── index.ts            # Public exports
├── package.json
└── tsconfig.json
```

---

## Implementation Details

### 1. Supabase Client Setup

Create `packages/auth/src/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Storage adapter for session persistence
const expoStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteAsync(key),
};

// Create Supabase client with custom storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: expoStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native doesn't use URLs
  },
});

// App-specific client creation (uses separate anon keys per app)
export function createAppClient(appId: 'qigong' | 'walking' | 'gtg') {
  return createClient(SUPABASE_URL, getAnonKeyForApp(appId), {
    auth: {
      storage: expoStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

function getAnonKeyForApp(appId: string): string {
  // These would be different anon keys per app in production
  const keys: Record<string, string> = {
    qigong: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_QIGONG ?? SUPABASE_ANON_KEY,
    walking: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_WALKING ?? SUPABASE_ANON_KEY,
    gtg: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_GTG ?? SUPABASE_ANON_KEY,
  };
  return keys[appId] ?? SUPABASE_ANON_KEY;
}
```

### 2. Type Definitions

Create `packages/auth/src/types.ts`:

```typescript
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

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  confirmPassword: string;
}

export interface OAuthCredentials {
  provider: 'apple' | 'google';
}

export type AuthError = {
  message: string;
  status?: number;
};
```

### 3. Auth Context

Create `packages/auth/src/context/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../client';
import type { AuthState, AuthUser } from '../types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children, appId }: { children: ReactNode; appId: 'qigong' | 'walking' | 'gtg' }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state from Supabase
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // Add app_id to user type (metadata from Supabase)
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
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
        options: {
          data: {
            app_id: appId, // Tag user with app_id
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [appId]);

  const signInWithApple = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          queryParams: {
            app_id: appId, // Custom param to tag user
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [appId]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            app_id: appId,
          },
        },
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

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appId}://auth/reset-password`,
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [appId]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signInWithApple,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useSession() {
  const { session, isLoading } = useAuth();
  return { session, isLoading };
}

export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}
```

### 4. Apple Sign In Provider

Create `packages/auth/src/providers/Apple.tsx`:

```typescript
import React from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button, type ButtonProps } from '@company/ui';

interface AppleSignInButtonProps extends Omit<ButtonProps, 'onPress'> {
  onSuccess?: (credential: string) => void;
  onError?: (error: Error) => void;
}

export function AppleSignInButton({ 
  onSuccess, 
  onError, 
  ...props 
}: AppleSignInButtonProps) {
  const handlePress = async () => {
    if (Platform.OS !== 'ios') {
      onError?.(new Error('Apple Sign In is only available on iOS'));
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // credential.identityToken contains the JWT to send to Supabase
      onSuccess?.(credential.identityToken ?? '');
    } catch (error) {
      if ((error as Error).name === 'AppleAuthenticationCancelError') {
        // User cancelled - not an error
        return;
      }
      onError?.(error as Error);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={8}
      style={{ width: 200, height: 44 }}
      onPress={handlePress}
    />
  );
}

// Hook to use Apple Sign In
export function useAppleSignIn(appId: 'qigong' | 'walking' | 'gtg') {
  const { signInWithApple } = useAuth();

  const signIn = async () => {
    const { error } = await signInWithApple();
    
    if (error) {
      throw error;
    }

    // The OAuth flow will handle the token exchange automatically
    // Supabase will create/update the user record
  };

  return { signIn };
}
```

---

## Apple Sign In Configuration

### 1. Apple Developer Console Setup

1. **Create App ID** (if not already created):
   - Go to https://developer.apple.com
   - Certificates, Identifiers & Profiles
   - Identifiers > Add > App ID
   - Select "App" type
   - Fill in Bundle ID and name
   - Enable "Sign In with Apple"

2. **Create Service ID** (for backend):
   - Identifiers > Add > Service ID
   - Enable "Sign In with Apple"
   - Configure "Return URLs"

3. **Create Private Key**:
   - Keys > Add > Sign In with Apple
   - Download the private key (.p8 file)
   - Note the Key ID and Team ID

### 2. Supabase Dashboard Configuration

Navigate to: Authentication > Providers > Apple

```
Team ID: [Your Team ID]
Client ID: [Service ID from Apple Developer Console]
Key ID: [Private Key ID]
Private Key: [Paste contents of .p8 file]
```

### 3. App Configuration

In your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.gtg",
      "infoPlist": {
        "SignInWithApple": true
      }
    },
    "plugin": [
      [
        "expo-apple-authentication",
        {
          "entitlements": {
            "com.apple.developer.applesignin": ["Default"]
          }
        }
      ]
    ]
  }
}
```

---

## OAuth Flow for Apple Sign In

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Apple Sign In Flow                           │
└─────────────────────────────────────────────────────────────────────┘

Mobile App                         Apple                     Supabase
    │                                │                           │
    │  1. User taps "Sign in with Apple"                          │
    │───────────────────────────────>                             │
    │                                │                           │
    │  2. Show Apple auth dialog                                   │
    │<───────────────────────────────>                             │
    │                                │                           │
    │  3. User authenticates + approves                           │
    │<───────────────────────────────>                             │
    │                                │                           │
    │  4. Return authorization code                                │
    │<───────────────────────────────>                             │
    │                                │                           │
    │  5. Send code to Supabase                                     │
    │─────────────────────────────────────────────────────────────>│
    │                                │                           │
    │                                │  Exchange code for tokens │
    │                                │<─────────────────────────>│
    │                                │                           │
    │  6. Return session (JWT)                                     │
    │<─────────────────────────────────────────────────────────────│
    │                                │                           │
    │  7. App has authenticated session                            │
    │                                                                   │
```

---

## RevenueCat Integration (Future)

### Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Payment Integration Flow                          │
└─────────────────────────────────────────────────────────────────────┘

Mobile App                         RevenueCat                   Apple/Google
    │                                │                           │
    │  1. Purchase subscription                              │
    │─────────────────────────────────────────────────────────────>│
    │                                │                           │
    │  2. Return StoreKit receipt                            │
    │<─────────────────────────────────────────────────────────────│
    │                                │                           │
    │  3. Send receipt to RevenueCat                          │
    │─────────────────────────────────────────────────────────────>│
    │                                │                           │
    │                                │  Validate receipt          │
    │                                │<─────────────────────────>│
    │                                │                           │
    │  4. Return entitlements (pro status)                     │
    │<─────────────────────────────────────────────────────────────│
    │                                │                           │
    │  5. Update local state + sync to Supabase                 │
    │─────────────────────────────────────────────────────────────>│
    │                                                                   │
```

### Supabase Integration with RevenueCat

Store subscription status in Supabase for cross-device sync:

```typescript
// Edge Function: Handle RevenueCat webhooks
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_KEY')!
  );

  const body = await req.json();
  
  // RevenueCat webhook verification
  const signingKey = Deno.env.get('REVENUECAT_SIGNING_KEY');
  
  // Process subscription events
  switch (body.event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: body.app_user_id,
          entitlement_id: body.entitlements.active,
          expires_date: body.expiration_at_ms,
          auto_renewing: body.autoRenewing,
          last_sync: new Date().toISOString(),
        });
      break;
      
    case 'CANCELLATION':
      await supabase
        .from('subscriptions')
        .update({ cancelled: true, cancel_reason: body.cancellation_reason })
        .eq('user_id', body.app_user_id);
      break;
  }

  return new Response('OK', { status: 200 });
});
```

---

## Auth Security Best Practices

### 1. Token Storage

- Use `expo-secure-store` for storing refresh tokens (encrypted)
- Never store tokens in AsyncStorage or plain text

### 2. Session Management

```typescript
// Auto-refresh before expiry
const refreshSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.expires_at) {
    const expiresIn = session.expires_at * 1000 - Date.now();
    
    // Refresh if less than 5 minutes remaining
    if (expiresIn < 5 * 60 * 1000) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        // Force sign out
        await supabase.auth.signOut();
      }
    }
  }
};
```

### 3. App Switch Security

When using Apple Sign In, the callback happens via URL scheme:
- Register URL scheme in `app.json` (e.g., `gtg://`)
- Handle callback in `app/_layout.tsx` with `useURL` hook

```typescript
// In app/_layout.tsx
import { useURL } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const url = useURL();
  
  // Handle OAuth callback
  useEffect(() => {
    if (url?.includes('auth/callback')) {
      // Supabase handles the callback automatically
      // No manual intervention needed
    }
  }, [url]);

  return <Stack />;
}
```

### 4. Rate Limiting

Configure in Supabase:
- Max login attempts: 5 per 15 minutes
- Max password reset requests: 3 per hour
- Session timeout: 7 days (refresh token), 1 hour (access token)

---

## Testing Auth

### Local Development with ngrok

For testing OAuth callbacks on localhost:

```bash
# Install ngrok
brew install ngrok

# Start tunnel to local Supabase
ngrok http 54321

# Use the https URL as SUPABASE_URL in development
```

### Test Accounts

Create test users in Supabase Dashboard:
- test@qigong.com (app_id: qigong)
- test@walking.com (app_id: walking)  
- test@gtg.com (app_id: gtg)

---

## Troubleshooting

### Common Issues

1. **Apple Sign In not working in Expo Go**
   - Apple Sign In requires a physical device or standalone build
   - Test with `eas build --local` or TestFlight

2. **OAuth redirect failing**
   - Ensure URL scheme is registered in `app.json`
   - Check callback URL in Supabase matches exactly

3. **Session not persisting**
   - Verify `expo-secure-store` is correctly installed
   - Check that storage adapter is passed to createClient

4. **Users getting mixed up between apps**
   - Verify `app_id` is being set on sign up
   - Check RLS policies include `app_id` filter

---

## Environment Variables

Create `.env.example`:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_ANON_KEY_QIGONG=eyJ...
EXPO_PUBLIC_SUPABASE_ANON_KEY_WALKING=eyJ...
EXPO_PUBLIC_SUPABASE_ANON_KEY_GTG=eyJ...

# OAuth Providers (optional, for fallback)
APPLE_CLIENT_ID=com.yourcompany.gtg
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```