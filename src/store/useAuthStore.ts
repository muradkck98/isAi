import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { User } from '../types';
import { zustandSecureStorage } from '../lib/storage';
import { monitoring, Events } from '../lib/monitoring';
import { identifyPurchaseUser, resetPurchaseUser } from '../lib/purchases';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  error: string | null;

  /** Email waiting for OTP verification after register */
  pendingOtpEmail: string | null;
  /** Pending registration data — set during register, consumed after OTP verify */
  pendingRegistration: { password: string; phone?: string } | null;

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
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasCompletedOnboarding: false,
      error: null,
      pendingOtpEmail: null,
      pendingRegistration: null,

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
          monitoring.identify(user.id);
          identifyPurchaseUser(user.id);
          monitoring.track(Events.LOGIN_SUCCESS, { method: 'email' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          monitoring.track(Events.LOGIN_FAILED, { error: message });
          throw err;
        }
      },

      // ─── Register ─────────────────────────────────────────────────────────
      // Sends OTP only — no signUp call, no confirmation link email.
      // Account is finalized in verifyOtp() after code is confirmed.
      register: async (email, password, phone) => {
        // Set pendingOtpEmail BEFORE the API call so onAuthStateChange
        // guard fires correctly if SIGNED_IN arrives during the request
        set({ isLoading: true, error: null, pendingOtpEmail: email, pendingRegistration: { password, phone } });
        try {
          await api.auth.register(email, password, phone);
          set({ isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ isLoading: false, error: message, pendingOtpEmail: null, pendingRegistration: null });
          throw err;
        }
      },

      // ─── Re-send OTP ──────────────────────────────────────────────────────
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
          const message = err instanceof Error ? err.message : 'Failed to send code';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── Verify OTP ───────────────────────────────────────────────────────
      // 1. Verify the 6-digit code
      // 2. If this is a new registration, update the password on the account
      // 3. Save phone to profiles if provided
      verifyOtp: async (email, token) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });
          if (error) throw error;
          if (!data.user) throw new Error('Verification failed — no user returned');

          const pending = get().pendingRegistration;

          // If registering: set password on the newly created account
          if (pending?.password) {
            const { error: updateError } = await supabase.auth.updateUser({
              password: pending.password,
            });
            if (updateError) throw updateError;

            // Save phone to profiles
            if (pending.phone) {
              await supabase
                .from('profiles')
                .upsert({ id: data.user.id, phone: pending.phone, provider: 'email' });
            }
          }

          const user: User = {
            id: data.user.id,
            email: data.user.email ?? '',
            createdAt: data.user.created_at,
          };

          set({
            user,
            isAuthenticated: true,
            pendingOtpEmail: null,
            pendingRegistration: null,
            isLoading: false,
          });

          monitoring.identify(user.id);
          identifyPurchaseUser(user.id);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Code verification failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ─── Google OAuth ─────────────────────────────────────────────────────
      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.auth.loginWithGoogle(idToken);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          monitoring.identify(user.id);
          identifyPurchaseUser(user.id);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Google sign-in failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      // ─── Logout ───────────────────────────────────────────────────────────
      logout: async () => {
        set({ isLoading: true });
        try {
          monitoring.track(Events.LOGOUT);
          monitoring.reset();
          resetPurchaseUser();
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
            pendingRegistration: null,
          });
        }
      },

      // ─── Restore session from SecureStore on app boot ─────────────────────
      initialize: async () => {
        // Skip if already authenticated (e.g. onAuthStateChange already ran)
        if (get().isAuthenticated) {
          set({ isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const session = await api.auth.getSession();
          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email ?? '',
              createdAt: session.user.created_at,
            };
            set({ user, isAuthenticated: true });
            monitoring.identify(user.id);
            identifyPurchaseUser(user.id);
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
  const store = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session?.user) {
    // Guard: if user is in OTP flow, do NOT auto-login yet.
    // This prevents signUp's SIGNED_IN event from bypassing OTP verification.
    if (store.pendingOtpEmail) {
      store.setLoading(false);
      return;
    }

    const user: User = {
      id: session.user.id,
      email: session.user.email ?? '',
      createdAt: session.user.created_at,
    };

    // Only update if not already set (avoid overwriting verifyOtp result)
    if (!store.isAuthenticated) {
      store.setUser(user);
      monitoring.identify(user.id);
      identifyPurchaseUser(user.id);
    }
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
    resetPurchaseUser();
  } else if (event === 'USER_UPDATED' && session?.user) {
    store.setUser({
      id: session.user.id,
      email: session.user.email ?? '',
      createdAt: session.user.created_at,
    });
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    // Session silently refreshed — keep user in sync
    if (!store.user) {
      store.setUser({
        id: session.user.id,
        email: session.user.email ?? '',
        createdAt: session.user.created_at,
      });
    }
  }

  store.setLoading(false);
});
