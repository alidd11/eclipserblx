
-- Atomic seller pending balance increment (prevents read-then-write race)
CREATE OR REPLACE FUNCTION public.increment_seller_pending_balance(
  p_seller_id uuid,
  p_store_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.seller_balances (user_id, store_id, pending_balance, available_balance, total_earned)
  VALUES (p_seller_id, p_store_id, p_amount, 0, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    pending_balance = COALESCE(seller_balances.pending_balance, 0) + p_amount,
    total_earned = COALESCE(seller_balances.total_earned, 0) + p_amount,
    updated_at = now();
END;
$$;

-- Idempotent credit fulfillment check
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
  -- Check if already fulfilled
  SELECT EXISTS(
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id
      AND reference_id = p_reference_id
      AND type = 'purchase'
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN false; -- Already fulfilled
  END IF;
  
  -- Perform the credit addition
  PERFORM public.add_credits(p_user_id, p_amount, 'purchase', p_description, p_reference_id);
  RETURN true;
END;
$$;

-- Atomic ad ping increment
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

-- Cleanup old processed webhook events (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.processed_webhook_events
  WHERE processed_at < now() - interval '7 days';
END;
$$;
