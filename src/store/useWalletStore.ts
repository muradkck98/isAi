import { create } from 'zustand';
import { SCAN_COST, AD_REWARD_TOKENS } from '../constants';
import { api } from '../services/api';

// No AsyncStorage persistence — wallet is always synced from Supabase on login.
// Eliminates "NativeModule: AsyncStorage is null" errors.

interface WalletState {
  tokens: number;
  totalScans: number;
  totalPurchased: number;
  totalEarnedFromAds: number;
  isSyncing: boolean;

  // Local-first actions (optimistic)
  hasEnoughTokens: () => boolean;
  deductToken: () => void;
  addTokensFromAd: () => void;
  addTokensFromPurchase: (amount: number) => void;
  setTokens: (tokens: number) => void;
  setTotalScans: (count: number) => void;

  // Supabase sync
  syncFromSupabase: (userId: string) => Promise<void>;
  deductTokenRemote: (userId: string) => Promise<void>;
  addAdTokensRemote: (userId: string) => Promise<void>;
  addPurchasedTokensRemote: (userId: string, amount: number) => Promise<void>;

  // Reset on logout
  reset: () => void;
}

const DEFAULT_STATE = {
  tokens: 0,
  totalScans: 0,
  totalPurchased: 0,
  totalEarnedFromAds: 0,
  isSyncing: false,
};

export const useWalletStore = create<WalletState>()((set, get) => ({
  ...DEFAULT_STATE,

  hasEnoughTokens: () => get().tokens >= SCAN_COST,

  // ── Optimistic local updates ──────────────────────────────────────────────
  deductToken: () =>
    set((state) => ({
      tokens: Math.max(0, state.tokens - SCAN_COST),
      totalScans: state.totalScans + 1,
    })),

  addTokensFromAd: () =>
    set((state) => ({
      tokens: state.tokens + AD_REWARD_TOKENS,
      totalEarnedFromAds: state.totalEarnedFromAds + AD_REWARD_TOKENS,
    })),

  addTokensFromPurchase: (amount) =>
    set((state) => ({
      tokens: state.tokens + amount,
      totalPurchased: state.totalPurchased + amount,
    })),

  setTokens: (tokens) => set({ tokens }),
  setTotalScans: (count) => set({ totalScans: count }),

  // ── Supabase sync ─────────────────────────────────────────────────────────
  syncFromSupabase: async (userId) => {
    set({ isSyncing: true });
    try {
      const wallet = await api.wallet.getInfo(userId);
      set({
        tokens: wallet.tokens,
        totalScans: wallet.totalScans,
        totalPurchased: wallet.totalPurchased,
        totalEarnedFromAds: wallet.totalEarnedFromAds,
      });
    } catch {
      // Keep current state if sync fails (offline-first)
    } finally {
      set({ isSyncing: false });
    }
  },

  deductTokenRemote: async (userId) => {
    // Local optimistic deduct already called by the navigator before navigating.
    // This only syncs the authoritative count from Supabase.
    try {
      const newTokens = await api.wallet.deductToken(userId);
      set({ tokens: newTokens });
    } catch {
      // Rollback the optimistic local deduct
      set((state) => ({
        tokens: state.tokens + SCAN_COST,
        totalScans: state.totalScans - 1,
      }));
      throw new Error('Token deduction failed');
    }
  },

  addAdTokensRemote: async (userId) => {
    get().addTokensFromAd();
    try {
      const newTokens = await api.wallet.addAdTokens(userId, AD_REWARD_TOKENS);
      set({ tokens: newTokens });
    } catch {
      // Rollback
      set((state) => ({
        tokens: state.tokens - AD_REWARD_TOKENS,
        totalEarnedFromAds: state.totalEarnedFromAds - AD_REWARD_TOKENS,
      }));
    }
  },

  addPurchasedTokensRemote: async (userId, amount) => {
    get().addTokensFromPurchase(amount);
    try {
      const newTokens = await api.wallet.addPurchasedTokens(userId, amount);
      set({ tokens: newTokens });
    } catch {
      // Rollback
      set((state) => ({
        tokens: state.tokens - amount,
        totalPurchased: state.totalPurchased - amount,
      }));
      throw new Error('Token addition failed');
    }
  },

  reset: () => set(DEFAULT_STATE),
}));
