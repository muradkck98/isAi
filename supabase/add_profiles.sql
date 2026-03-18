-- ═══════════════════════════════════════════════════════════════════════════
-- isAi — Profiles Table (phone uniqueness + abuse prevention)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Profiles table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone        TEXT UNIQUE,                  -- enforces 1 account per phone number
  display_name TEXT,
  provider     TEXT DEFAULT 'email',         -- 'email' | 'google'
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── Update signup trigger to also create profile ────────────────────────────
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

  -- Log the signup bonus transaction
  INSERT INTO public.token_transactions (user_id, amount, type)
  VALUES (NEW.id, 3, 'signup_bonus');

  -- Create profile (phone comes later via upsert from the app)
  INSERT INTO public.profiles (id, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ─── Helper: check phone uniqueness (called before registration) ──────────────
-- Returns true if phone is already registered
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
