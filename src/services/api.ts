// ─── API Service ──────────────────────────────────────────────────────────────
// Auth   → Supabase Auth
// AI     → Sightengine via Edge Function (base64, no Storage upload)
// Wallet → Supabase wallets table
// No scan history stored — reduces cost and complexity.

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { ScanResult, User, WalletInfo } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapUser(supabaseUser: { id: string; email?: string; created_at: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    createdAt: supabaseUser.created_at,
  };
}

interface AIDetectionResult {
  probability: number;
  deepfake: number;
  generators: Record<string, number>;
}

async function callAIDetection(
  imageUri: string,
  base64?: string
): Promise<AIDetectionResult> {
  const isRemote = imageUri.startsWith('http://') || imageUri.startsWith('https://');

  const body = isRemote
    ? { image_url: imageUri }
    : {
        image_base64: base64!,
        mime_type: imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      };

  const { data, error } = await supabase.functions.invoke('detect-ai', { body });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (typeof data?.probability !== 'number') throw new Error('Invalid response from detect-ai');

  return {
    probability: data.probability,
    deepfake:    data.deepfake   ?? 0,
    generators:  data.generators ?? {},
  };
}

function classifyProbability(p: number): ScanResult['classification'] {
  if (p > 80) return 'ai_generated';
  if (p > 60) return 'likely_ai';
  if (p > 40) return 'uncertain';
  if (p > 20) return 'likely_real';
  return 'real';
}

function confidenceFromProbability(p: number): ScanResult['confidenceLevel'] {
  if (p > 75 || p < 25) return 'high';
  if (p > 60 || p < 40) return 'medium';
  return 'low';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('User not found');
      return mapUser(data.user);
    },

    // register: sends OTP only — account is created when OTP is verified.
    // We do NOT call signUp here to avoid Supabase sending a confirmation link email.
    // The password is stored temporarily and used after OTP verification via signUp.
    register: async (email: string, password: string, phone?: string): Promise<void> => {
      // Check phone uniqueness — ignore RPC errors (function may not exist yet)
      if (phone) {
        try {
          const { data: taken } = await supabase.rpc('is_phone_taken', { p_phone: phone });
          if (taken) throw new Error('This phone number is already registered');
        } catch (err: unknown) {
          // Only re-throw if it's our own error, not an RPC-not-found error
          if (err instanceof Error && err.message === 'This phone number is already registered') {
            throw err;
          }
          // RPC doesn't exist yet — skip phone check, continue
        }
      }

      // Send OTP — shouldCreateUser: true creates the account on verification
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw new Error(error.message);
    },

    loginWithGoogle: async (idToken: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Google sign-in failed');
      await supabase.from('profiles').upsert({ id: data.user.id, provider: 'google' }, { onConflict: 'id' });
      return mapUser(data.user);
    },

    logout: async (): Promise<void> => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    getSession: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  },

  // ─── Scan ────────────────────────────────────────────────────────────────────

  scan: {
    analyze: async (
      imageUri: string,
      _userId: string,
      socialMeta?: { platform?: string; postUrl?: string; authorName?: string | null }
    ): Promise<ScanResult> => {
      const isRemote = imageUri.startsWith('http://') || imageUri.startsWith('https://');

      let base64: string | undefined;
      if (!isRemote) {
        base64 = await readAsStringAsync(imageUri, { encoding: EncodingType.Base64 });
      }

      const { probability, deepfake, generators } = await callAIDetection(imageUri, base64);

      const classification  = classifyProbability(probability);
      const confidenceLevel = confidenceFromProbability(probability);

      return {
        id:                  `scan_${Date.now()}`,
        userId:              _userId,
        imageUrl:            imageUri,
        aiProbability:       probability,
        deepfakeProbability: deepfake,
        aiGenerators:        Object.keys(generators).length > 0 ? generators : undefined,
        classification,
        confidenceLevel,
        createdAt:           new Date().toISOString(),
        metadata:            socialMeta ? { socialMeta } : undefined,
      };
    },
  },

  // ─── Wallet ──────────────────────────────────────────────────────────────────

  wallet: {
    getInfo: async (userId: string): Promise<WalletInfo> => {
      const { data, error } = await supabase
        .from('wallets')
        .select('tokens, total_purchased, total_earned_from_ads, total_scans')
        .eq('user_id', userId)
        .single();

      if (error) throw new Error(error.message);

      return {
        tokens:             data.tokens,
        totalScans:         data.total_scans ?? 0,
        totalPurchased:     data.total_purchased,
        totalEarnedFromAds: data.total_earned_from_ads,
      };
    },

    deductToken: async (userId: string): Promise<number> => {
      const { data, error } = await supabase.rpc('deduct_token', { p_user_id: userId });

      if (error) {
        // Fallback manual update if RPC not available
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tokens, total_scans')
          .eq('user_id', userId)
          .single();

        const newTokens = Math.max(0, (wallet?.tokens ?? 1) - 1);
        const newScans  = (wallet?.total_scans ?? 0) + 1;

        await supabase
          .from('wallets')
          .update({ tokens: newTokens, total_scans: newScans })
          .eq('user_id', userId);

        return newTokens;
      }

      return data as number;
    },

    addAdTokens: async (userId: string, amount: number): Promise<number> => {
      // Use RPC for atomic increment to prevent race conditions
      const { data, error } = await supabase.rpc('add_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_source: 'ad',
      });

      if (error) {
        // Fallback manual update
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tokens, total_earned_from_ads')
          .eq('user_id', userId)
          .single();

        const newTokens = (wallet?.tokens ?? 0) + amount;
        const newEarned = (wallet?.total_earned_from_ads ?? 0) + amount;

        await supabase
          .from('wallets')
          .update({ tokens: newTokens, total_earned_from_ads: newEarned })
          .eq('user_id', userId);

        return newTokens;
      }

      return data as number;
    },

    addPurchasedTokens: async (userId: string, amount: number): Promise<number> => {
      // Use RPC for atomic increment to prevent race conditions
      const { data, error } = await supabase.rpc('add_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_source: 'purchase',
      });

      if (error) {
        // Fallback manual update
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tokens, total_purchased')
          .eq('user_id', userId)
          .single();

        const newTokens    = (wallet?.tokens ?? 0) + amount;
        const newPurchased = (wallet?.total_purchased ?? 0) + amount;

        await supabase
          .from('wallets')
          .update({ tokens: newTokens, total_purchased: newPurchased })
          .eq('user_id', userId);

        return newTokens;
      }

      return data as number;
    },
  },
};
