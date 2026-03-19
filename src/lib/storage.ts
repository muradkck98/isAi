import * as SecureStore from 'expo-secure-store';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Zustand persist storage using expo-secure-store.
 * Replaces @react-native-async-storage/async-storage to avoid
 * "NativeModule: AsyncStorage is null" errors in Expo managed builds.
 *
 * Limit: ~2KB per key — suitable for small config state only.
 * Do NOT use for large arrays (scan history, etc.).
 */
export const zustandSecureStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // Warn if payload is too large for SecureStore
      if (value.length > 1800) {
        console.warn(`[SecureStorage] "${name}" payload is ${value.length} bytes — near 2KB limit.`);
      }
      await SecureStore.setItemAsync(name, value);
    } catch (err) {
      console.warn(`[SecureStorage] setItem failed for "${name}":`, err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // Ignore deletion errors
    }
  },
}));
