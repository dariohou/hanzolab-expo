import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, type AppId } from '../client';
import type { AuthState, AuthUser } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
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
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const userWithAppId = { ...session.user, app_id: appId } as AuthUser;
          setState({ session, user: userWithAppId, isLoading: false, isAuthenticated: true });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (session?.user) {
        const userWithAppId = { ...session.user, app_id: appId } as AuthUser;
        setState({ session, user: userWithAppId, isLoading: false, isAuthenticated: true });
      } else {
        setState({ session: null, user: null, isLoading: false, isAuthenticated: false });
      }
    });

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

  const signUp = useCallback(
    async (email: string, password: string) => {
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
    },
    [appId],
  );

  const signInWithOAuth = useCallback(
    async (provider: 'apple' | 'google') => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { queryParams: { app_id: appId } },
        });
        return { error: error as Error | null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [appId],
  );

  const signInWithApple = useCallback(() => signInWithOAuth('apple'), [signInWithOAuth]);
  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appId}://auth/reset-password`,
        });
        return { error: error as Error | null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [appId],
  );

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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

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
