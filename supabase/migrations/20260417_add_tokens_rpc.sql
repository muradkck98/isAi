-- ─── Migration: Add add_tokens RPC ────────────────────────────────────────────
-- Adds the add_tokens function used by wallet operations (ad rewards, purchases).
-- This RPC was missing from the initial schema.

CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id UUID,
  p_amount   INTEGER,
  p_source   TEXT   -- 'ad' | 'purchase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tokens INTEGER;
BEGIN
  -- Validate source
  IF p_source NOT IN ('ad', 'purchase') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- Atomically add tokens
  UPDATE public.wallets
  SET
    tokens                 = tokens + p_amount,
    total_earned_from_ads  = CASE WHEN p_source = 'ad'       THEN total_earned_from_ads + p_amount  ELSE total_earned_from_ads  END,
    total_purchased        = CASE WHEN p_source = 'purchase' THEN total_purchased       + p_amount  ELSE total_purchased        END,
    updated_at             = NOW()
  WHERE user_id = p_user_id
  RETURNING tokens INTO v_tokens;

  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Log the transaction
  INSERT INTO public.token_transactions (user_id, amount, type)
  VALUES (
    p_user_id,
    p_amount,
    CASE WHEN p_source = 'ad' THEN 'ad_reward' ELSE 'purchase' END
  );

  RETURN v_tokens;
END;
$$;
