-- ═══════════════════════════════════════════════════════════════════════════
-- isAi — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Wallets ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tokens                INTEGER DEFAULT 3 NOT NULL CHECK (tokens >= 0),
  total_purchased       INTEGER DEFAULT 0 NOT NULL,
  total_earned_from_ads INTEGER DEFAULT 0 NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Scans ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scans (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url        TEXT NOT NULL,
  ai_probability   NUMERIC(5,2) NOT NULL CHECK (ai_probability >= 0 AND ai_probability <= 100),
  classification   TEXT NOT NULL CHECK (classification IN ('ai_generated','likely_ai','uncertain','likely_real','real')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high','medium','low')),
  social_platform  TEXT,
  social_post_url  TEXT,
  social_author    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Token Transactions (audit log) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount       INTEGER NOT NULL,   -- positive = credit, negative = debit
  type         TEXT NOT NULL CHECK (type IN ('purchase','ad_reward','scan_cost','signup_bonus')),
  reference_id TEXT,               -- scan_id for scan_cost, etc.
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scans_user_id_created ON public.scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id, created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only see/update their own wallet
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert_own" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update_own" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Scans: users can only see/insert their own scans
CREATE POLICY "scans_select_own" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scans_insert_own" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: users can only see their own transactions
CREATE POLICY "transactions_select_own" ON public.token_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.token_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Auto-create wallet + signup bonus trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create wallet with 3 free starter tokens
  INSERT INTO public.wallets (user_id, tokens)
  VALUES (NEW.id, 3);

  -- Log the signup bonus transaction
  INSERT INTO public.token_transactions (user_id, amount, type)
  VALUES (NEW.id, 3, 'signup_bonus');

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Updated_at auto-update ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_updated_at ON public.wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
