-- ─── Migration: Remove scan history, add total_scans to wallets ───────────────
-- Removes the scans table (no longer needed — scan results are ephemeral).
-- Adds total_scans counter to wallets for displaying scan count.
-- Updates deduct_token RPC to not require a scan_id and to increment total_scans.

-- 1. Add total_scans column to wallets (safe to run multiple times)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS total_scans INTEGER NOT NULL DEFAULT 0;

-- 2. Drop the old deduct_token RPC (had p_scan_id parameter)
DROP FUNCTION IF EXISTS public.deduct_token(UUID, UUID);

-- 3. Create updated deduct_token RPC (no scan_id, increments total_scans)
CREATE OR REPLACE FUNCTION public.deduct_token(p_user_id UUID)
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

  -- Deduct 1 token and increment scan count
  UPDATE public.wallets
  SET tokens      = tokens - 1,
      total_scans = total_scans + 1,
      updated_at  = NOW()
  WHERE user_id = p_user_id;

  RETURN v_tokens - 1;
END;
$$;

-- 4. Drop the scans table (no longer used — no history stored)
-- Note: token_transactions 'scan_cost' entries no longer have a reference_id
-- but that column is nullable so no schema change needed.
DROP TABLE IF EXISTS public.scans CASCADE;
