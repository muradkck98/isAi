import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: () => void;
  setError: (error: string | null) => void;

  // Auth operations
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;

  // Session restore on app start
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasCompletedOnboarding: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      setOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      setError: (error) => set({ error }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.auth.login(email, password);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Giriş başarısız';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.auth.register(email, password, phone);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Kayıt başarısız';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.auth.loginWithGoogle(idToken);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Google ile giriş başarısız';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await api.auth.logout();
        } catch {
          // Even if API call fails, clear local state
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          // Check for existing Supabase session (stored in SecureStore)
          const session = await api.auth.getSession();
          if (session?.user) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email ?? '',
                createdAt: session.user.created_at,
              },
              isAuthenticated: true,
            });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist onboarding state — auth session comes from SecureStore via Supabase
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

// ─── Supabase Auth State Listener ─────────────────────────────────────────────
// Keeps local store in sync with Supabase session events
// (e.g., token refresh, sign out from another device, OAuth callback)
supabase.auth.onAuthStateChange((event, session) => {
  const { setUser, setLoading } = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session?.user) {
    setUser({
      id: session.user.id,
      email: session.user.email ?? '',
      createdAt: session.user.created_at,
    });
  } else if (event === 'SIGNED_OUT') {
    setUser(null);
  } else if (event === 'USER_UPDATED' && session?.user) {
    setUser({
      id: session.user.id,
      email: session.user.email ?? '',
      createdAt: session.user.created_at,
    });
  }

  setLoading(false);
});
