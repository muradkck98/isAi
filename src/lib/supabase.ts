import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';

// ─── SecureStore adapter (recommended by Supabase for React Native) ───────────
// Stores JWT tokens encrypted in device secure storage (Keychain / Keystore)
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Supabase Client ──────────────────────────────────────────────────────────
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit', // PKCE causes code_verifier loss on Android Chrome Custom Tab
  },
});

// ─── DB Table Types ───────────────────────────────────────────────────────────
export interface DbWallet {
  id: string;
  user_id: string;
  tokens: number;
  total_purchased: number;
  total_earned_from_ads: number;
  created_at: string;
  updated_at: string;
}

export interface DbScan {
  id: string;
  user_id: string;
  image_url: string;
  ai_probability: number;
  classification: 'ai_generated' | 'likely_ai' | 'uncertain' | 'likely_real' | 'real';
  confidence_level: 'high' | 'medium' | 'low';
  social_platform?: string;
  social_post_url?: string;
  social_author?: string;
  created_at: string;
}

export interface DbTokenTransaction {
  id: string;
  user_id: string;
  amount: number; // positive = credit, negative = debit
  type: 'purchase' | 'ad_reward' | 'scan_cost' | 'signup_bonus';
  reference_id?: string;
  created_at: string;
}
