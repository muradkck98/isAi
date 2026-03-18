// ─── API Service — Supabase Integration ──────────────────────────────────────
// Auth   → Supabase Auth (email/password + Google OAuth)
// DB     → Supabase PostgreSQL (wallets, scans tables)
// AI     → Mock for now; swap AI_API.BASE_URL in env.ts when ready

import { supabase } from '../lib/supabase';
import { ScanResult, User, WalletInfo } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map Supabase auth user → app User */
function mapUser(supabaseUser: { id: string; email?: string; created_at: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    createdAt: supabaseUser.created_at,
  };
}

/** Mock AI detection — replace with real call once API key is ready */
async function callAIDetection(imageUri: string): Promise<{ probability: number }> {
  // TODO: replace with real AI endpoint
  // const response = await fetch(`${AI_API.BASE_URL}/detect`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${AI_API.KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ image_url: imageUri }),
  // });
  // const data = await response.json();
  // return { probability: data.ai_probability };

  await new Promise((r) => setTimeout(r, 2500));
  return { probability: Math.round(Math.random() * 100 * 10) / 10 };
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
    /** Sign in with email + password */
    login: async (email: string, password: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Kullanıcı bulunamadı');
      return mapUser(data.user);
    },

    /** Create new account — saves phone to profiles for uniqueness enforcement */
    register: async (email: string, password: string, phone?: string): Promise<User> => {
      // 1. Check phone uniqueness before creating account
      if (phone) {
        const { data: taken } = await supabase.rpc('is_phone_taken', { p_phone: phone });
        if (taken) throw new Error('Bu telefon numarası zaten kayıtlı');
      }

      // 2. Create auth account (trigger auto-creates wallet + profile)
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Kayıt başarısız');

      // 3. Save phone to profile
      if (phone) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, phone, provider: 'email' });
      }

      return mapUser(data.user);
    },

    /** Sign in with Google ID token (from expo-auth-session) */
    loginWithGoogle: async (idToken: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Google ile giriş başarısız');

      // Upsert profile with google provider (wallet created by trigger)
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, provider: 'google' }, { onConflict: 'id' });

      return mapUser(data.user);
    },

    /** Sign out — clears SecureStore session */
    logout: async (): Promise<void> => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    /** Get current session (used on app startup) */
    getSession: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },

    /** Check if a phone number is already registered */
    isPhoneTaken: async (phone: string): Promise<boolean> => {
      const { data } = await supabase.rpc('is_phone_taken', { p_phone: phone });
      return !!data;
    },
  },

  // ─── Scan ──────────────────────────────────────────────────────────────────

  scan: {
    /** Run AI detection and save result to Supabase */
    analyze: async (
      imageUri: string,
      userId: string,
      socialMeta?: { platform?: string; postUrl?: string; authorName?: string | null }
    ): Promise<ScanResult> => {
      // 1. Run AI detection
      const { probability } = await callAIDetection(imageUri);

      const classification = classifyProbability(probability);
      const confidenceLevel = confidenceFromProbability(probability);

      // 2. Persist scan to Supabase
      const { data, error } = await supabase
        .from('scans')
        .insert({
          user_id: userId,
          image_url: imageUri,
          ai_probability: probability,
          classification,
          confidence_level: confidenceLevel,
          social_platform: socialMeta?.platform ?? null,
          social_post_url: socialMeta?.postUrl ?? null,
          social_author: socialMeta?.authorName ?? null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        aiProbability: data.ai_probability,
        classification: data.classification,
        confidenceLevel: data.confidence_level,
        createdAt: data.created_at,
      };
    },

    /** Fetch scan history for a user (latest 50) */
    getHistory: async (userId: string): Promise<ScanResult[]> => {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        imageUrl: row.image_url,
        aiProbability: row.ai_probability,
        classification: row.classification,
        confidenceLevel: row.confidence_level,
        createdAt: row.created_at,
      }));
    },
  },

  // ─── Wallet ────────────────────────────────────────────────────────────────

  wallet: {
    /** Get wallet for a user */
    getInfo: async (userId: string): Promise<WalletInfo> => {
      const { data, error } = await supabase
        .from('wallets')
        .select('tokens, total_purchased, total_earned_from_ads')
        .eq('user_id', userId)
        .single();

      if (error) throw new Error(error.message);

      // Count total scans from the scans table
      const { count } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        tokens: data.tokens,
        totalScans: count ?? 0,
        totalPurchased: data.total_purchased,
        totalEarnedFromAds: data.total_earned_from_ads,
      };
    },

    /** Deduct 1 token and log the transaction */
    deductToken: async (userId: string, scanId: string): Promise<number> => {
      // Atomic decrement via RPC (avoids race conditions)
      const { data, error } = await supabase.rpc('deduct_token', {
        p_user_id: userId,
        p_scan_id: scanId,
      });

      if (error) {
        // Fallback: manual update if RPC not yet created
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tokens')
          .eq('user_id', userId)
          .single();

        const newTokens = (wallet?.tokens ?? 1) - 1;
        await supabase
          .from('wallets')
          .update({ tokens: Math.max(0, newTokens) })
          .eq('user_id', userId);

        await supabase.from('token_transactions').insert({
          user_id: userId,
          amount: -1,
          type: 'scan_cost',
          reference_id: scanId,
        });

        return Math.max(0, newTokens);
      }

      return data as number;
    },

    /** Add tokens from ad reward */
    addAdTokens: async (userId: string, amount: number): Promise<number> => {
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

      await supabase.from('token_transactions').insert({
        user_id: userId,
        amount,
        type: 'ad_reward',
      });

      return newTokens;
    },

    /** Add tokens from purchase */
    addPurchasedTokens: async (userId: string, amount: number): Promise<number> => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('tokens, total_purchased')
        .eq('user_id', userId)
        .single();

      const newTokens = (wallet?.tokens ?? 0) + amount;
      const newPurchased = (wallet?.total_purchased ?? 0) + amount;

      await supabase
        .from('wallets')
        .update({ tokens: newTokens, total_purchased: newPurchased })
        .eq('user_id', userId);

      await supabase.from('token_transactions').insert({
        user_id: userId,
        amount,
        type: 'purchase',
      });

      return newTokens;
    },
  },
};
