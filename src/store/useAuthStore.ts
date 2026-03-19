import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { User } from '../types';
import { zustandSecureStorage } from '../lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  error: string | null;

  /** Email waiting for OTP verification after register */
  pendingOtpEmail: string | null;

  // Setters
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingCompleted: () => void;
  setError: (error: string | null) => void;

  // Auth operations
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
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
      pendingOtpEmail: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      setOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      setError: (error) => set({ error }),

      // ─── Login ────────────────────────────────────────────────────────────
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

      // ─── Register → sets pendingOtpEmail, does NOT log user in yet ────────
      register: async (email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          await api.auth.register(email, password, phone);
          // Send OTP so user can verify their email
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
          });
          if (otpError) throw otpError;
          set({ isLoading: false, pendingOtpEmail: email });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Kayıt başarısız';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // ─── Re-send OTP (from OTP screen "Resend" button) ────────────────────
      sendOtp: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
          });
          if (error) throw error;
          set({ pendingOtpEmail: email });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Kod gönderilemedi';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── Verify OTP code (type = 'email' for signInWithOtp flow) ──────────
      verifyOtp: async (email, token) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });
          if (error) throw error;
          if (data.user) {
            set({
              user: {
                id: data.user.id,
                email: data.user.email ?? '',
                createdAt: data.user.created_at,
              },
              isAuthenticated: true,
              pendingOtpEmail: null,
            });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Kod doğrulanamadı';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── Google OAuth (handled by LoginScreen + App.tsx deep link) ────────
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

      // ─── Logout ───────────────────────────────────────────────────────────
      logout: async () => {
        set({ isLoading: true });
        try {
          await api.auth.logout();
        } catch {
          // Clear local state even if API fails
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            pendingOtpEmail: null,
          });
        }
      },

      // ─── Restore session from SecureStore on app boot ─────────────────────
      initialize: async () => {
        set({ isLoading: true });
        try {
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
      storage: zustandSecureStorage,
      // Only persist onboarding flag — auth session comes from SecureStore via Supabase
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

// ─── Supabase Auth State Listener ─────────────────────────────────────────────
// Keeps local store in sync with Supabase session events
// (token refresh, sign out from another device, Google OAuth callback)
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
