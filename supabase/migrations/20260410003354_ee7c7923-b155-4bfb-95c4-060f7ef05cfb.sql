
DROP VIEW IF EXISTS public.orders_seller_view CASCADE;
DROP VIEW IF EXISTS public.seller_payouts_masked CASCADE;
DROP VIEW IF EXISTS public.store_payment_details_masked CASCADE;
DROP VIEW IF EXISTS public.affiliate_payouts_masked CASCADE;
DROP VIEW IF EXISTS public.seller_payouts_safe CASCADE;
DROP VIEW IF EXISTS public.store_payment_details_safe CASCADE;
DROP VIEW IF EXISTS public.user_payment_details_safe CASCADE;
DROP VIEW IF EXISTS public.store_credentials_safe CASCADE;
DROP VIEW IF EXISTS public.seller_webhooks_safe CASCADE;
DROP VIEW IF EXISTS public.affiliate_payouts_safe CASCADE;
DROP VIEW IF EXISTS public.download_tokens_safe CASCADE;

DROP FUNCTION IF EXISTS public.mask_bank_account(text) CASCADE;
DROP FUNCTION IF EXISTS public.mask_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.mask_token(text) CASCADE;

CREATE FUNCTION public.mask_bank_account(val text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT CASE WHEN val IS NULL OR length(val) <= 4 THEN '****' ELSE repeat('*', length(val) - 4) || right(val, 4) END; $$;

CREATE FUNCTION public.mask_email(val text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT CASE WHEN val IS NULL THEN NULL WHEN position('@' in val) <= 1 THEN '***@' || split_part(val, '@', 2) ELSE left(val, 1) || repeat('*', position('@' in val) - 2) || substring(val from position('@' in val)) END; $$;

CREATE FUNCTION public.mask_token(val text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT CASE WHEN val IS NULL THEN NULL WHEN length(val) <= 6 THEN '******' ELSE left(val, 6) || repeat('*', LEAST(length(val) - 6, 20)) END; $$;

CREATE VIEW public.orders_seller_view WITH (security_invoker = on) AS
SELECT id, user_id, status, total, subtotal, payment_method, payment_id, created_at, updated_at,
  CASE WHEN user_id = auth.uid() THEN customer_email WHEN has_permission(auth.uid(), 'view_orders'::text) THEN customer_email ELSE mask_email(customer_email) END AS customer_email,
  discount_amount, discount_code_id, refunded_at, refund_amount, refund_id
FROM public.orders;
GRANT SELECT ON public.orders_seller_view TO authenticated;

CREATE VIEW public.store_payment_details_safe WITH (security_invoker = on) AS
SELECT id, store_id, payout_method, payouts_enabled, bank_name, bank_account_holder,
  mask_bank_account(bank_account_number) AS bank_account_number,
  mask_bank_account(bank_routing_number) AS bank_routing_number,
  mask_bank_account(bank_swift_bic) AS bank_swift_bic,
  bank_country, mask_email(paypal_email) AS paypal_email, mask_token(stripe_account_id) AS stripe_account_id,
  details_submitted, created_at, updated_at
FROM public.store_payment_details;
GRANT SELECT ON public.store_payment_details_safe TO authenticated;

CREATE VIEW public.user_payment_details_safe WITH (security_invoker = on) AS
SELECT user_id, preferred_payout_method, bank_name, bank_account_holder,
  mask_bank_account(bank_account_number) AS bank_account_number,
  mask_bank_account(bank_routing_number) AS bank_routing_number,
  mask_bank_account(bank_swift_bic) AS bank_swift_bic,
  bank_country, mask_email(paypal_email) AS paypal_email, mask_token(stripe_account_id) AS stripe_account_id,
  created_at, updated_at
FROM public.user_payment_details;
GRANT SELECT ON public.user_payment_details_safe TO authenticated;

CREATE VIEW public.store_credentials_safe WITH (security_invoker = on) AS
SELECT id, store_id,
  CASE WHEN discord_webhook_url IS NOT NULL THEN '... configured ...' ELSE NULL END AS discord_webhook_url,
  CASE WHEN review_discord_webhook_url IS NOT NULL THEN '... configured ...' ELSE NULL END AS review_discord_webhook_url,
  CASE WHEN discord_bot_token IS NOT NULL THEN '... configured ...' ELSE NULL END AS discord_bot_token,
  CASE WHEN cloudflare_api_token IS NOT NULL THEN '... configured ...' ELSE NULL END AS cloudflare_api_token,
  CASE WHEN cloudflare_zone_id IS NOT NULL THEN mask_token(cloudflare_zone_id) ELSE NULL END AS cloudflare_zone_id,
  discord_guild_id, discord_role_id, product_drops_role_id, early_product_drops_role_id,
  orders_channel_id, refunds_channel_id, disputes_channel_id, sales_channel_id, product_feed_channel_id,
  created_at, updated_at
FROM public.store_credentials;
GRANT SELECT ON public.store_credentials_safe TO authenticated;

CREATE VIEW public.seller_webhooks_safe WITH (security_invoker = on) AS
SELECT id, store_id, url, events, is_active,
  mask_token(secret) AS secret,
  last_triggered_at, last_status_code, created_at, updated_at
FROM public.seller_webhooks;
GRANT SELECT ON public.seller_webhooks_safe TO authenticated;

CREATE VIEW public.affiliate_payouts_safe WITH (security_invoker = on) AS
SELECT id, user_id, amount, status, payout_method,
  mask_email(paypal_email) AS paypal_email,
  mask_token(stripe_account_id) AS stripe_account_id,
  mask_token(stripe_transfer_id) AS stripe_transfer_id,
  notes, processed_at, processed_by, created_at
FROM public.affiliate_payouts;
GRANT SELECT ON public.affiliate_payouts_safe TO authenticated;

CREATE VIEW public.seller_payouts_safe WITH (security_invoker = on) AS
SELECT id, seller_id, store_id, amount, status, payout_method, auto_processed,
  mask_email(paypal_email) AS paypal_email,
  mask_token(stripe_transfer_id) AS stripe_transfer_id,
  stripe_funding_payout_id, funding_status, funding_requested_at, failure_reason,
  wise_transfer_id, wise_quote_id,
  notes, processed_at, processed_by, completed_at, created_at
FROM public.seller_payouts;
GRANT SELECT ON public.seller_payouts_safe TO authenticated;

CREATE VIEW public.download_tokens_safe WITH (security_invoker = on) AS
SELECT id, token, user_id, product_id, order_item_id, signed_url,
  expires_at, used_at, created_at
FROM public.download_tokens;
GRANT SELECT ON public.download_tokens_safe TO authenticated;
