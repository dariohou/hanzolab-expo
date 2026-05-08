import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const expoStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: expoStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type AppId = 'qigong' | 'walking' | 'gtg';

export function createAppClient(appId: AppId) {
  const keys: Record<AppId, string> = {
    qigong: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_QIGONG ?? SUPABASE_ANON_KEY,
    walking: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_WALKING ?? SUPABASE_ANON_KEY,
    gtg: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_GTG ?? SUPABASE_ANON_KEY,
  };
  return createClient(SUPABASE_URL, keys[appId], {
    auth: {
      storage: expoStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
