export { supabase, createAppClient, type AppId } from './client';
export type { AuthState, AuthUser, SignInCredentials, SignUpCredentials, AuthError } from './types';
export {
  AuthProvider,
  useAuth,
  useSession,
  useUser,
  useIsAuthenticated,
} from './context/AuthContext';
