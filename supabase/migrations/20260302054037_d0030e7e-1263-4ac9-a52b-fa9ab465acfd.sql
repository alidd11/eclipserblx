
-- Atomic function to request a seller payout: inserts the payout record and deducts balance in a single transaction
CREATE OR REPLACE FUNCTION public.request_seller_payout(
  p_store_id UUID,
  p_seller_id UUID,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_payout_id UUID;
BEGIN
  -- Lock the balance row to prevent concurrent modifications
  SELECT available_balance INTO v_current_balance
  FROM public.seller_balances
  WHERE user_id = p_seller_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'No seller balance found for user %', p_seller_id;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: available £%, requested £%', v_current_balance, p_amount;
  END IF;

  IF p_amount < 25 THEN
    RAISE EXCEPTION 'Minimum payout amount is £25';
  END IF;

  -- Check for existing pending payout
  IF EXISTS (
    SELECT 1 FROM public.seller_payouts
    WHERE store_id = p_store_id AND status IN ('pending', 'processing', 'awaiting_funds')
  ) THEN
    RAISE EXCEPTION 'You already have a pending payout request';
  END IF;

  -- Insert payout record
  INSERT INTO public.seller_payouts (store_id, seller_id, amount, status)
  VALUES (p_store_id, p_seller_id, p_amount, 'pending')
  RETURNING id INTO v_payout_id;

  -- Atomically deduct from available and add to pending
  UPDATE public.seller_balances
  SET
    available_balance = available_balance - p_amount,
    pending_balance = COALESCE(pending_balance, 0) + p_amount,
    updated_at = now()
  WHERE user_id = p_seller_id;

  RETURN v_payout_id;
END;
$$;
