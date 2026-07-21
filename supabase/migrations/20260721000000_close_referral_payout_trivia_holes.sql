-- Three live security holes found during a full pre-launch audit.

-- 1. referrals: "Users can create referrals as referrer" only checked
-- auth.uid() = referrer_id, with no validation on referred_id/referral_code.
-- Permissive policies OR together, so this bypassed the "Users can link
-- themselves as referred" fix from the previous migration entirely — any
-- user could insert themselves as referrer against an arbitrary existing
-- user's id and later skim affiliate commission off that victim's
-- purchases via process-referral. No app code path uses this policy
-- (all three signup flows insert as the referred user, looking up the
-- referrer's real profile first), so it's dropped rather than tightened.
DROP POLICY "Users can create referrals as referrer" ON public.referrals;

-- 2. request_seller_payout had no ownership check at all: any authenticated
-- user could call it with someone else's p_seller_id/p_store_id and force
-- a payout against a victim's balance.
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
  v_payout_method TEXT;
  v_paypal_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_seller_id THEN
    RAISE EXCEPTION 'Not authorized to request a payout for this seller';
  END IF;

  IF NOT public.is_store_owner(p_store_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to request a payout for this store';
  END IF;

  SELECT COALESCE(
    (SELECT value::numeric FROM public.settings WHERE key = 'seller_minimum_payout' LIMIT 1),
    5
  ) INTO v_min_payout;

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

  SELECT spd.payout_method, spd.paypal_email
  INTO v_payout_method, v_paypal_email
  FROM public.store_payment_details spd
  WHERE spd.store_id = p_store_id;

  v_payout_method := COALESCE(v_payout_method, 'stripe');

  INSERT INTO public.seller_payouts (store_id, seller_id, amount, status, payout_method, paypal_email)
  VALUES (p_store_id, p_seller_id, p_amount, 'pending', v_payout_method,
    CASE WHEN v_payout_method = 'paypal' THEN v_paypal_email ELSE NULL END)
  RETURNING id INTO v_payout_id;

  UPDATE public.seller_balances
  SET
    available_balance = available_balance - p_amount,
    pending_balance = COALESCE(pending_balance, 0) + p_amount,
    updated_at = now()
  WHERE user_id = p_seller_id;

  RETURN v_payout_id;
END;
$function$;

-- 3. discord_trivia_questions: an extra base-table SELECT policy (qual: true
-- for authenticated, alongside the table's existing staff-only and
-- service-role policies) let any logged-in user read correct_answer/
-- wrong_answers directly, defeating the discord_trivia_questions_safe view
-- that exists specifically to hide those two columns from players.
DROP POLICY "Authenticated users can read trivia questions" ON public.discord_trivia_questions;
