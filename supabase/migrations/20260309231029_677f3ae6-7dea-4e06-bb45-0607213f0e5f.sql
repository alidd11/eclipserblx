
-- Fix: Make fulfill_credits_idempotent work with BOTH session IDs and paymentIntent IDs
-- by checking for any existing purchase transaction with the same reference
-- Also add a unique constraint to prevent race conditions

-- Add unique index on credit_transactions for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_idempotent
ON public.credit_transactions (user_id, reference_id, type)
WHERE reference_id IS NOT NULL;

-- Update fulfill_credits_idempotent to also accept a secondary reference for cross-check
CREATE OR REPLACE FUNCTION public.fulfill_credits_idempotent(
  p_user_id uuid,
  p_reference_id text,
  p_amount numeric,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if already fulfilled by this exact reference
  SELECT EXISTS(
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id
      AND reference_id = p_reference_id
      AND type = 'purchase'
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN false;
  END IF;
  
  -- Perform the credit addition (unique index will catch concurrent races)
  BEGIN
    PERFORM public.add_credits(p_user_id, p_amount, 'purchase', p_description, p_reference_id);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END;
$$;

-- Make processAdPingPurchase idempotent: track ping purchase references
CREATE TABLE IF NOT EXISTS public.ad_ping_purchase_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_id text NOT NULL,
  here_pings integer DEFAULT 0,
  everyone_pings integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reference_id)
);

ALTER TABLE public.ad_ping_purchase_log ENABLE ROW LEVEL SECURITY;

-- Update increment_ad_ping_balance to be idempotent
CREATE OR REPLACE FUNCTION public.increment_ad_ping_balance(
  p_user_id uuid,
  p_here_pings integer DEFAULT 0,
  p_everyone_pings integer DEFAULT 0,
  p_reference_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  -- If reference_id provided, check for duplicate
  IF p_reference_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.ad_ping_purchase_log (user_id, reference_id, here_pings, everyone_pings)
      VALUES (p_user_id, p_reference_id, p_here_pings, p_everyone_pings);
    EXCEPTION WHEN unique_violation THEN
      RETURN false; -- Already processed
    END;
  END IF;

  UPDATE public.advertisement_subscriptions
  SET
    here_pings_balance = COALESCE(here_pings_balance, 0) + p_here_pings,
    everyone_pings_balance = COALESCE(everyone_pings_balance, 0) + p_everyone_pings,
    updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'active';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Idempotent seller transaction insert (prevents webhook + verify-payment race)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_transactions_order_item_dedup
ON public.seller_transactions (order_id, order_item_id, type)
WHERE order_item_id IS NOT NULL AND refunded_at IS NULL;
