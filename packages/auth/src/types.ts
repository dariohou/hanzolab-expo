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

export type AuthError = {
  message: string;
  status?: number;
};
