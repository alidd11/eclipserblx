
CREATE OR REPLACE FUNCTION public.request_seller_payout(p_store_id uuid, p_seller_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance NUMERIC;
  v_payout_id UUID;
  v_min_payout NUMERIC;
BEGIN
  -- Read minimum payout from settings table (fallback to 5 if not set)
  SELECT COALESCE(
    (SELECT value::numeric FROM public.settings WHERE key = 'seller_minimum_payout' LIMIT 1),
    5
  ) INTO v_min_payout;

  -- Lock the balance row to prevent concurrent modifications
  SELECT available_balance INTO v_current_balance
  FROM public.seller_balances
  WHERE user_id = p_seller_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'No seller balance found for user %', p_seller_id;
  END IF;

  IF p_amount < v_min_payout THEN
    RAISE EXCEPTION 'Minimum payout amount is £%', v_min_payout;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: available £%, requested £%', v_current_balance, p_amount;
  END IF;

  -- Create payout record and deduct balance atomically
  INSERT INTO public.seller_payouts (store_id, seller_id, amount, status)
  VALUES (p_store_id, p_seller_id, p_amount, 'pending')
  RETURNING id INTO v_payout_id;

  -- Move funds from available to pending
  UPDATE public.seller_balances
  SET 
    available_balance = available_balance - p_amount,
    pending_balance = COALESCE(pending_balance, 0) + p_amount,
    updated_at = now()
  WHERE user_id = p_seller_id;

  RETURN v_payout_id;
END;
$function$;
