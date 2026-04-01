-- ─── isAi Database Schema ──────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to set up the full database schema.
-- Tables: profiles, wallets, scans, token_transactions
-- RPCs:   is_phone_taken, deduct_token
-- Triggers: auto-create wallet + profile on signup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT UNIQUE,
  provider    TEXT NOT NULL DEFAULT 'email',  -- 'email' | 'google'
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── wallets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens                INTEGER NOT NULL DEFAULT 3,  -- new users start with 3 free tokens
  total_purchased       INTEGER NOT NULL DEFAULT 0,
  total_earned_from_ads INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── scans ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url        TEXT NOT NULL,
  ai_probability   NUMERIC(5,2) NOT NULL CHECK (ai_probability >= 0 AND ai_probability <= 100),
  classification   TEXT NOT NULL CHECK (classification IN ('ai_generated','likely_ai','uncertain','likely_real','real')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high','medium','low')),
  social_platform  TEXT,
  social_post_url  TEXT,
  social_author    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── token_transactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,  -- positive = credit, negative = debit
  type         TEXT NOT NULL CHECK (type IN ('purchase','ad_reward','scan_cost','signup_bonus')),
  reference_id UUID,  -- scan id for scan_cost, purchase id for purchase
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.token_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Trigger: auto-create wallet + profile on new signup ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create wallet with 3 free starter tokens
  INSERT INTO public.wallets (user_id, tokens)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create profile
  INSERT INTO public.profiles (id, provider)
  VALUES (NEW.id, COALESCE(NEW.raw_app_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO NOTHING;

  -- Log signup bonus transaction
  INSERT INTO public.token_transactions (user_id, amount, type)
  VALUES (NEW.id, 3, 'signup_bonus');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── RPC: is_phone_taken ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_phone_taken(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = p_phone
  );
END;
$$;

-- ─── RPC: deduct_token ────────────────────────────────────────────────────────
-- Atomically deducts 1 token, logs the transaction, returns new balance.
-- Raises an exception if the user has 0 tokens (insufficient balance).
CREATE OR REPLACE FUNCTION public.deduct_token(p_user_id UUID, p_scan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tokens INTEGER;
BEGIN
  -- Lock the wallet row and get current balance
  SELECT tokens INTO v_tokens
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_tokens <= 0 THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Deduct 1 token
  UPDATE public.wallets
  SET tokens = tokens - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the deduction
  INSERT INTO public.token_transactions (user_id, amount, type, reference_id)
  VALUES (p_user_id, -1, 'scan_cost', p_scan_id);

  RETURN v_tokens - 1;
END;
$$;

-- ─── updated_at trigger function ──────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Storage: scan-images bucket ──────────────────────────────────────────────
-- Create a public bucket for scan images (read by Sightengine via public URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scan-images',
  'scan-images',
  true,           -- public = Sightengine can fetch the image URL
  10485760,       -- 10MB max per image
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only authenticated users can upload to their own folder (userId/filename)
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scan-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: public read (needed so Sightengine can fetch the image URL)
CREATE POLICY "Public read scan-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'scan-images');

-- RLS: users can delete only their own files
CREATE POLICY "Users delete own scan-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scan-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
