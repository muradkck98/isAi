// ─── API Service — Supabase Integration ──────────────────────────────────────
// Auth   → Supabase Auth (email/password + Google OAuth)
// DB     → Supabase PostgreSQL (wallets, scans tables)
// AI     → Sightengine via Supabase Edge Function (API key stays server-side)

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

/**
 * AI Detection via Supabase Edge Function → Sightengine
 *
 * Flow: mobile → supabase.functions.invoke('detect-ai') → Sightengine API
 * API keys never leave the server.
 *
 * Deploy Edge Function:
 *   supabase functions deploy detect-ai
 *   supabase secrets set SIGHTENGINE_API_USER=xxx SIGHTENGINE_API_SECRET=yyy
 *
 * Falls back to mock if Edge Function returns an error (dev/staging safety net).
 */
async function callAIDetection(imageUri: string): Promise<{ probability: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('detect-ai', {
      body: { image_url: imageUri },
    });

    if (error) throw new Error(error.message);
    if (typeof data?.probability !== 'number') throw new Error('Invalid response from detect-ai');

    return { probability: data.probability };
  } catch (err) {
    // Dev fallback: if Edge Function not deployed yet, use mock
    if (__DEV__) {
      console.warn('[AI Detection] Edge Function unavailable, using mock:', err);
      await new Promise((r) => setTimeout(r, 1500));
      return { probability: Math.round(Math.random() * 100 * 10) / 10 };
    }
    throw err;
  }
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
      if (!data.user) throw new Error('User not found');
      return mapUser(data.user);
    },

    /** Create new account — saves phone to profiles for uniqueness enforcement */
    register: async (email: string, password: string, phone?: string): Promise<User> => {
      // 1. Check phone uniqueness before creating account
      if (phone) {
        const { data: taken } = await supabase.rpc('is_phone_taken', { p_phone: phone });
        if (taken) throw new Error('This phone number is already registered');
      }

      // 2. Create auth account (trigger auto-creates wallet + profile)
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Registration failed');

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
      if (!data.user) throw new Error('Google sign-in failed');

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
    /**
     * Upload image to Supabase Storage and return a public URL.
     * Sightengine requires a publicly accessible URL — local file:// URIs don't work.
     * Social scan URLs (https://) are passed through directly.
     */
    uploadImage: async (imageUri: string, userId: string): Promise<string> => {
      // Social/web URLs are already public — no upload needed
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        return imageUri;
      }

      // Local file → upload to Supabase Storage
      const filename = `${userId}/${Date.now()}.jpg`;

      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('scan-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from('scan-images')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    },

    /** Run AI detection and save result to Supabase */
    analyze: async (
      imageUri: string,
      userId: string,
      socialMeta?: { platform?: string; postUrl?: string; authorName?: string | null }
    ): Promise<ScanResult> => {
      // 1. Upload image to get a public URL (required by Sightengine)
      const publicImageUrl = await api.scan.uploadImage(imageUri, userId);

      // 2. Run AI detection via Edge Function → Sightengine
      const { probability } = await callAIDetection(publicImageUrl);

      const classification = classifyProbability(probability);
      const confidenceLevel = confidenceFromProbability(probability);

      // 3. Persist scan to Supabase
      const { data, error } = await supabase
        .from('scans')
        .insert({
          user_id: userId,
          image_url: publicImageUrl,
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
