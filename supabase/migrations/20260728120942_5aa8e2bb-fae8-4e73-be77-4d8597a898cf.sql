ALTER TABLE public.affiliate_payouts
  ADD COLUMN IF NOT EXISTS balance_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_released_at timestamptz;

ALTER TABLE public.affiliate_payouts
  DROP CONSTRAINT IF EXISTS affiliate_payouts_status_check;

ALTER TABLE public.affiliate_payouts
  ADD CONSTRAINT affiliate_payouts_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected'));

ALTER TABLE public.seller_transactions
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS reversed_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_status_check;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'completed', 'reversed'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'fulfilled', 'partially_refunded', 'refunded', 'cancelled'));

DROP POLICY IF EXISTS "Users can request payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Users can request aff payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Sellers can request payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Sellers request payouts" ON public.seller_payouts;

CREATE OR REPLACE FUNCTION public.request_seller_payout(
  p_store_id uuid, p_seller_id uuid, p_amount numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_current_balance numeric; v_payout_id uuid; v_min_payout numeric;
  v_payout_method text; v_paypal_email text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_seller_id THEN
    RAISE EXCEPTION 'Not authorized to request a payout for this seller' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_store_owner(p_store_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to request a payout for this store' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Invalid payout amount' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE((SELECT value::numeric FROM public.settings WHERE key = 'seller_minimum_payout' LIMIT 1), 5) INTO v_min_payout;
  SELECT available_balance INTO v_current_balance FROM public.seller_balances WHERE user_id = p_seller_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No seller balance found'; END IF;
  IF p_amount < v_min_payout THEN RAISE EXCEPTION 'Payout amount is below the minimum'; END IF;
  IF COALESCE(v_current_balance, 0) < p_amount THEN RAISE EXCEPTION 'Insufficient seller balance'; END IF;
  IF EXISTS (SELECT 1 FROM public.seller_payouts WHERE store_id = p_store_id AND status IN ('pending', 'processing', 'awaiting_funds')) THEN
    RAISE EXCEPTION 'A seller payout is already pending';
  END IF;
  SELECT payout_method, paypal_email INTO v_payout_method, v_paypal_email FROM public.store_payment_details WHERE store_id = p_store_id;
  v_payout_method := COALESCE(v_payout_method, 'stripe');
  INSERT INTO public.seller_payouts (store_id, seller_id, amount, status, payout_method, paypal_email)
  VALUES (p_store_id, p_seller_id, p_amount, 'pending', v_payout_method,
    CASE WHEN v_payout_method = 'paypal' THEN v_paypal_email ELSE NULL END)
  RETURNING id INTO v_payout_id;
  UPDATE public.seller_balances
  SET available_balance = available_balance - p_amount,
      pending_balance = COALESCE(pending_balance, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_seller_id;
  RETURN v_payout_id;
END; $$;

REVOKE ALL ON FUNCTION public.request_seller_payout(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_seller_payout(uuid, uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_payout_for_processing(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_seller_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payout_for_processing(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_seller_balance(uuid, numeric) TO service_role;

UPDATE public.seller_transactions SET refunded_amount = COALESCE(net_amount, 0) WHERE refunded_at IS NOT NULL AND refunded_amount = 0;
UPDATE public.affiliate_commissions SET reversed_amount = COALESCE(commission_amount, 0) WHERE reversed_at IS NOT NULL AND reversed_amount = 0;

CREATE OR REPLACE FUNCTION public.release_escrow_funds()
RETURNS TABLE(released_count integer, total_released numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_tx record; v_count integer := 0; v_total numeric := 0; v_remaining numeric;
BEGIN
  FOR v_tx IN
    SELECT id, seller_id,
      GREATEST(0, COALESCE(net_amount, 0) - COALESCE(refunded_amount, 0)) AS remaining_amount
    FROM public.seller_transactions
    WHERE escrow_hold_until IS NOT NULL AND escrow_hold_until <= now()
      AND escrow_released_at IS NULL AND escrow_frozen = false AND type = 'sale'
      AND GREATEST(0, COALESCE(net_amount, 0) - COALESCE(refunded_amount, 0)) > 0
    FOR UPDATE SKIP LOCKED
  LOOP
    v_remaining := v_tx.remaining_amount;
    UPDATE public.seller_transactions SET escrow_released_at = now() WHERE id = v_tx.id;
    UPDATE public.seller_balances
    SET pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - v_remaining),
        available_balance = COALESCE(available_balance, 0) + v_remaining,
        updated_at = now()
    WHERE user_id = v_tx.seller_id AND COALESCE(pending_balance, 0) >= v_remaining;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seller balance not found during escrow release'; END IF;
    v_count := v_count + 1; v_total := v_total + v_remaining;
  END LOOP;
  RETURN QUERY SELECT v_count, v_total;
END; $$;

UPDATE public.affiliate_payouts SET balance_reserved_at = COALESCE(balance_reserved_at, created_at, now()) WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS update_balance_on_payout_complete ON public.affiliate_payouts;

CREATE OR REPLACE FUNCTION public.update_balance_after_payout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.affiliate_balances
    SET total_paid = total_paid + NEW.amount,
        available_balance = CASE WHEN NEW.balance_reserved_at IS NULL
          THEN GREATEST(0, available_balance - NEW.amount) ELSE available_balance END,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('failed', 'rejected') AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.balance_reserved_at IS NOT NULL AND NEW.balance_released_at IS NULL
  THEN
    UPDATE public.affiliate_balances
    SET available_balance = available_balance + NEW.amount, updated_at = now()
    WHERE user_id = NEW.user_id;
    NEW.balance_released_at := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER update_balance_on_payout_complete
BEFORE UPDATE ON public.affiliate_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_balance_after_payout();

CREATE OR REPLACE FUNCTION public.reserve_affiliate_payout(
  p_user_id uuid, p_amount numeric, p_payout_method text,
  p_stripe_account_id text DEFAULT NULL, p_paypal_email text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_existing public.affiliate_payouts%ROWTYPE; v_payout_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Invalid payout reservation';
  END IF;
  IF p_payout_method NOT IN ('stripe', 'paypal', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payout method';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  SELECT * INTO v_existing FROM public.affiliate_payouts
    WHERE user_id = p_user_id AND status IN ('pending', 'processing')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF v_existing.amount = p_amount AND COALESCE(v_existing.payout_method, 'paypal') = p_payout_method THEN
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION 'An affiliate payout is already pending';
  END IF;
  UPDATE public.affiliate_balances
  SET available_balance = available_balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND available_balance >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient affiliate balance'; END IF;
  INSERT INTO public.affiliate_payouts (
    user_id, amount, payout_method, stripe_account_id, paypal_email, notes, status, balance_reserved_at
  ) VALUES (
    p_user_id, p_amount, p_payout_method, p_stripe_account_id, p_paypal_email, p_notes,
    CASE WHEN p_payout_method = 'stripe' THEN 'processing' ELSE 'pending' END, now()
  ) RETURNING id INTO v_payout_id;
  RETURN v_payout_id;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_affiliate_payout(
  p_payout_id uuid, p_user_id uuid, p_stripe_transfer_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_payout public.affiliate_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_payout FROM public.affiliate_payouts WHERE id = p_payout_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate payout not found'; END IF;
  IF v_payout.status = 'completed' THEN RETURN v_payout.stripe_transfer_id = p_stripe_transfer_id; END IF;
  IF v_payout.status <> 'processing' OR v_payout.balance_released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Affiliate payout is not completable';
  END IF;
  UPDATE public.affiliate_payouts
  SET status = 'completed', stripe_transfer_id = p_stripe_transfer_id,
      processed_at = now(), notes = 'Automatic Stripe transfer: ' || p_stripe_transfer_id
  WHERE id = p_payout_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.release_affiliate_payout(
  p_payout_id uuid, p_user_id uuid, p_failure_reason text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.affiliate_payouts WHERE id = p_payout_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_status = 'failed' THEN RETURN true; END IF;
  IF v_status = 'completed' THEN RETURN false; END IF;
  UPDATE public.affiliate_payouts
  SET status = 'failed', notes = LEFT(COALESCE(p_failure_reason, 'Payout provider request failed'), 500)
  WHERE id = p_payout_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_seller_payout(
  p_payout_id uuid, p_lock_id text, p_provider text, p_provider_reference text,
  p_status text, p_notes text, p_provider_secondary_reference text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_payout public.seller_payouts%ROWTYPE;
BEGIN
  IF p_provider NOT IN ('stripe', 'wise', 'paypal')
    OR p_status NOT IN ('processing', 'completed')
    OR NULLIF(p_provider_reference, '') IS NULL THEN
    RAISE EXCEPTION 'Invalid seller payout finalization';
  END IF;
  SELECT * INTO v_payout FROM public.seller_payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller payout not found'; END IF;
  IF (v_payout.status = p_status OR v_payout.status = 'completed')
    AND ((p_provider = 'stripe' AND v_payout.stripe_transfer_id = p_provider_reference)
         OR (p_provider = 'wise' AND v_payout.wise_transfer_id = p_provider_reference)
         OR (p_provider = 'paypal' AND v_payout.notes LIKE '%' || p_provider_reference || '%'))
  THEN RETURN true; END IF;
  IF v_payout.status <> 'pending' OR v_payout.processing_lock_id IS DISTINCT FROM p_lock_id THEN
    RETURN false;
  END IF;
  IF p_status = 'completed' THEN
    UPDATE public.seller_balances
    SET pending_balance = pending_balance - v_payout.amount,
        total_paid = total_paid + v_payout.amount, updated_at = now()
    WHERE user_id = v_payout.seller_id AND pending_balance >= v_payout.amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient seller balance during payout finalization'; END IF;
  END IF;
  UPDATE public.seller_payouts
  SET status = p_status, processed_at = now(), processed_by = NULL,
      notes = LEFT(p_notes, 1000), auto_processed = true,
      stripe_transfer_id = CASE WHEN p_provider = 'stripe' THEN p_provider_reference ELSE stripe_transfer_id END,
      wise_transfer_id = CASE WHEN p_provider = 'wise' THEN p_provider_reference ELSE wise_transfer_id END,
      wise_quote_id = CASE WHEN p_provider = 'wise' THEN p_provider_secondary_reference ELSE wise_quote_id END,
      funding_status = CASE WHEN p_provider = 'wise' THEN 'funded' ELSE funding_status END,
      processing_locked_at = NULL, processing_lock_id = NULL
  WHERE id = p_payout_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.settle_seller_payout(
  p_payout_id uuid, p_provider_reference text, p_status text, p_failure_reason text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_payout public.seller_payouts%ROWTYPE;
BEGIN
  IF p_status NOT IN ('completed', 'failed') OR NULLIF(p_provider_reference, '') IS NULL THEN
    RAISE EXCEPTION 'Invalid seller payout settlement';
  END IF;
  SELECT * INTO v_payout FROM public.seller_payouts
    WHERE id = p_payout_id AND wise_transfer_id = p_provider_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_payout.status = p_status THEN RETURN true; END IF;
  IF v_payout.status <> 'processing' THEN RETURN false; END IF;
  IF p_status = 'completed' THEN
    UPDATE public.seller_balances
    SET pending_balance = pending_balance - v_payout.amount,
        total_paid = total_paid + v_payout.amount, updated_at = now()
    WHERE user_id = v_payout.seller_id AND pending_balance >= v_payout.amount;
  ELSE
    UPDATE public.seller_balances
    SET pending_balance = pending_balance - v_payout.amount,
        available_balance = available_balance + v_payout.amount, updated_at = now()
    WHERE user_id = v_payout.seller_id AND pending_balance >= v_payout.amount;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient seller balance during payout settlement'; END IF;
  UPDATE public.seller_payouts
  SET status = p_status,
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
      processed_at = CASE WHEN p_status = 'completed' THEN COALESCE(processed_at, now()) ELSE processed_at END,
      failure_reason = CASE WHEN p_status = 'failed' THEN LEFT(COALESCE(p_failure_reason, 'Payout provider reported failure'), 1000) ELSE NULL END,
      processing_locked_at = NULL, processing_lock_id = NULL
  WHERE id = v_payout.id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_cumulative_order_refund(
  p_order_id uuid, p_charge_id text, p_cumulative_amount numeric, p_is_full_refund boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_order public.orders%ROWTYPE; v_previous numeric; v_cumulative numeric; v_delta numeric; v_fraction numeric;
  v_now timestamptz := now(); v_transaction record; v_commission record; v_target numeric; v_adjustment numeric;
BEGIN
  IF NULLIF(p_charge_id, '') IS NULL OR p_cumulative_amount IS NULL
    OR p_cumulative_amount < 0 OR p_cumulative_amount = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Invalid cumulative refund';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF COALESCE(v_order.total, 0) <= 0 THEN RAISE EXCEPTION 'Order total is invalid'; END IF;
  v_previous := LEAST(COALESCE(v_order.refund_amount, 0), v_order.total);
  v_cumulative := LEAST(p_cumulative_amount, v_order.total);
  IF v_cumulative <= v_previous THEN
    RETURN jsonb_build_object('applied', false, 'delta', 0, 'cumulative', v_previous,
      'is_full_refund', v_previous >= v_order.total);
  END IF;
  v_delta := v_cumulative - v_previous;
  v_fraction := v_cumulative / v_order.total;
  FOR v_transaction IN
    SELECT * FROM public.seller_transactions WHERE order_id = p_order_id AND type = 'sale' FOR UPDATE
  LOOP
    v_target := CASE WHEN p_is_full_refund OR v_cumulative >= v_order.total THEN COALESCE(v_transaction.net_amount, 0)
      ELSE ROUND(COALESCE(v_transaction.net_amount, 0) * v_fraction, 2) END;
    v_adjustment := GREATEST(0, v_target - COALESCE(v_transaction.refunded_amount, 0));
    IF v_adjustment > 0 THEN
      UPDATE public.seller_balances
      SET total_earned = GREATEST(0, total_earned - v_adjustment),
          pending_balance = CASE WHEN v_transaction.escrow_released_at IS NULL
            THEN GREATEST(0, COALESCE(pending_balance, 0) - v_adjustment) ELSE pending_balance END,
          available_balance = CASE WHEN v_transaction.escrow_released_at IS NOT NULL
            THEN GREATEST(0, COALESCE(available_balance, 0) - v_adjustment) ELSE available_balance END,
          updated_at = v_now
      WHERE user_id = v_transaction.seller_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Seller balance not found during refund accounting'; END IF;
      UPDATE public.seller_transactions
      SET refunded_amount = v_target,
          refunded_at = CASE WHEN v_target >= COALESCE(net_amount, 0) THEN v_now ELSE refunded_at END,
          refund_id = p_charge_id
      WHERE id = v_transaction.id;
    END IF;
  END LOOP;
  FOR v_commission IN SELECT * FROM public.affiliate_commissions WHERE order_id = p_order_id FOR UPDATE LOOP
    v_target := CASE WHEN p_is_full_refund OR v_cumulative >= v_order.total THEN COALESCE(v_commission.commission_amount, 0)
      ELSE ROUND(COALESCE(v_commission.commission_amount, 0) * v_fraction, 0) END;
    v_adjustment := GREATEST(0, v_target - COALESCE(v_commission.reversed_amount, 0));
    IF v_adjustment > 0 THEN
      UPDATE public.affiliate_balances
      SET total_earned = GREATEST(0, total_earned - v_adjustment),
          available_balance = GREATEST(0, available_balance - v_adjustment), updated_at = v_now
      WHERE user_id = v_commission.affiliate_id;
      UPDATE public.affiliate_commissions
      SET reversed_amount = v_target,
          status = CASE WHEN v_target >= COALESCE(commission_amount, 0) THEN 'reversed' ELSE status END,
          reversed_at = CASE WHEN v_target >= COALESCE(commission_amount, 0) THEN v_now ELSE reversed_at END,
          refund_id = p_charge_id
      WHERE id = v_commission.id;
    END IF;
  END LOOP;
  UPDATE public.orders
  SET status = CASE WHEN p_is_full_refund OR v_cumulative >= total THEN 'refunded' ELSE 'partially_refunded' END,
      refunded_at = CASE WHEN p_is_full_refund OR v_cumulative >= total THEN v_now ELSE refunded_at END,
      refund_amount = v_cumulative, refund_id = p_charge_id
  WHERE id = p_order_id;
  RETURN jsonb_build_object('applied', true, 'delta', v_delta, 'cumulative', v_cumulative,
    'is_full_refund', p_is_full_refund OR v_cumulative >= v_order.total);
END; $$;

REVOKE ALL ON FUNCTION public.reserve_affiliate_payout(uuid, numeric, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_affiliate_payout(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_affiliate_payout(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_seller_payout(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_seller_payout(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_cumulative_order_refund(uuid, text, numeric, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_balance_after_payout() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_escrow_funds() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_affiliate_payout(uuid, numeric, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_affiliate_payout(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_affiliate_payout(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_seller_payout(uuid, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_seller_payout(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_cumulative_order_refund(uuid, text, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow_funds() TO service_role;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260726030001', 'harden_payouts_and_partial_refunds', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;