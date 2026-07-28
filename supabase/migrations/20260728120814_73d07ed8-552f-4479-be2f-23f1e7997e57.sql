CREATE TABLE IF NOT EXISTS public.payment_checkout_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  discount_code_id uuid,
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  fulfilled_at timestamptz
);

ALTER TABLE public.payment_checkout_carts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_checkout_carts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_checkout_carts TO service_role;

CREATE INDEX IF NOT EXISTS idx_payment_checkout_carts_expires_at
  ON public.payment_checkout_carts(expires_at);

ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.processed_webhook_events
  DROP CONSTRAINT IF EXISTS processed_webhook_events_status_check;
ALTER TABLE public.processed_webhook_events
  ADD CONSTRAINT processed_webhook_events_status_check
  CHECK (status IN ('processing', 'succeeded', 'failed'));

UPDATE public.processed_webhook_events
SET status = 'succeeded',
    completed_at = COALESCE(completed_at, processed_at)
WHERE status = 'succeeded';

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event public.processed_webhook_events%ROWTYPE;
  v_inserted boolean := false;
BEGIN
  INSERT INTO public.processed_webhook_events (
      event_id, event_type, status, attempts, processed_at, locked_at
  )
  VALUES (
      p_event_id, p_event_type, 'processing', 1, now(), now()
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted THEN
    RETURN true;
  END IF;

  SELECT *
  INTO v_event
  FROM public.processed_webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF v_event.status = 'succeeded' THEN
    RETURN false;
  END IF;

  IF v_event.status = 'processing'
     AND v_event.locked_at IS NOT NULL
     AND v_event.locked_at > now() - interval '5 minutes' THEN
    RETURN false;
  END IF;

  UPDATE public.processed_webhook_events
  SET status = 'processing',
      attempts = attempts + 1,
      locked_at = now(),
      last_error = NULL,
      event_type = p_event_type
  WHERE event_id = p_event_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_stripe_webhook_event(
  p_event_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.processed_webhook_events
  SET status = 'succeeded',
      completed_at = now(),
      locked_at = NULL,
      last_error = NULL
  WHERE event_id = p_event_id;
$function$;

CREATE OR REPLACE FUNCTION public.fail_stripe_webhook_event(
  p_event_id text,
  p_error text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.processed_webhook_events
  SET status = 'failed',
      locked_at = NULL,
      last_error = left(COALESCE(p_error, 'Unknown processing error'), 1000)
  WHERE event_id = p_event_id
    AND status = 'processing';
$function$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_webhook_event(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_webhook_event(text, text) FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_transactions_one_sale_per_order_item
  ON public.seller_transactions(order_id, order_item_id, type)
  WHERE order_item_id IS NOT NULL AND type = 'sale';

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_one_product_per_order
  ON public.order_items(order_id, product_id);

CREATE OR REPLACE FUNCTION public.record_seller_sale_earning(
  p_seller_id uuid,
  p_store_id uuid,
  p_order_id uuid,
  p_order_item_id uuid,
  p_gross_amount numeric,
  p_stripe_fee numeric,
  p_net_before_commission numeric,
  p_platform_fee numeric,
  p_net_amount numeric,
  p_escrow_hold_until timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_transaction_id uuid;
BEGIN
  INSERT INTO public.seller_transactions (
    seller_id, store_id, order_id, order_item_id, gross_amount, stripe_fee,
    net_before_commission, platform_fee, net_amount, amount, type, status,
    escrow_hold_until
  )
  VALUES (
    p_seller_id, p_store_id, p_order_id, p_order_item_id, p_gross_amount,
    p_stripe_fee, p_net_before_commission, p_platform_fee, p_net_amount,
    p_net_amount, 'sale', 'completed', p_escrow_hold_until
  )
  ON CONFLICT (order_id, order_item_id, type)
    WHERE order_item_id IS NOT NULL AND type = 'sale'
  DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM public.increment_seller_pending_balance(
    p_seller_id, p_store_id, p_net_amount
  );
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_seller_sale_earning(
  uuid, uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_seller_pending_balance(uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits(
  uuid, numeric, public.credit_transaction_type, text, text, uuid, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, numeric, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fulfill_credits_idempotent(uuid, text, numeric, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_ad_ping_balance(uuid, integer, integer, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_webhook_events()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_webhook_event(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_webhook_event(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_seller_sale_earning(
  uuid, uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_seller_pending_balance(uuid, uuid, numeric)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credits(
  uuid, numeric, public.credit_transaction_type, text, text, uuid, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, numeric, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_credits_idempotent(uuid, text, numeric, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ad_ping_balance(uuid, integer, integer, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events()
  TO service_role;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260726030000', 'payment_fulfillment_hardening', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;