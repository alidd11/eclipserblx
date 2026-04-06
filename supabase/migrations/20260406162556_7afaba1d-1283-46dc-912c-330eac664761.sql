
CREATE OR REPLACE FUNCTION public.mask_account(acct text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN acct IS NULL THEN NULL
    WHEN length(acct) <= 4 THEN repeat('*', length(acct))
    ELSE repeat('*', length(acct) - 4) || right(acct, 4) END;
$$;

CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN email IS NULL THEN NULL
    WHEN position('@' in email) > 2 THEN left(email, 2) || repeat('*', position('@' in email) - 3) || substring(email from position('@' in email))
    ELSE repeat('*', position('@' in email) - 1) || substring(email from position('@' in email)) END;
$$;

CREATE OR REPLACE VIEW public.affiliate_applications_masked
WITH (security_invoker = on) AS
SELECT id, user_id, email, discord_username, display_name,
  promotion_method, audience_size, status, preferred_payout_method,
  public.mask_email(paypal_email) AS paypal_email,
  public.mask_account(bank_account_number) AS bank_account_number,
  public.mask_account(bank_routing_number) AS bank_routing_number,
  public.mask_account(bank_swift_bic) AS bank_swift_bic,
  bank_account_holder, bank_name, bank_country,
  affiliate_id, notes, rejection_reason, reviewed_at, reviewed_by,
  created_at, updated_at
FROM public.affiliate_applications;

CREATE OR REPLACE VIEW public.store_payment_details_masked
WITH (security_invoker = on) AS
SELECT id, store_id, payout_method, details_submitted, payouts_enabled,
  public.mask_email(paypal_email) AS paypal_email,
  public.mask_account(bank_account_number) AS bank_account_number,
  public.mask_account(bank_routing_number) AS bank_routing_number,
  public.mask_account(bank_swift_bic) AS bank_swift_bic,
  bank_account_holder, bank_name, bank_country, stripe_account_id,
  created_at, updated_at
FROM public.store_payment_details;

CREATE OR REPLACE VIEW public.affiliate_payouts_masked
WITH (security_invoker = on) AS
SELECT id, user_id, amount, status, payout_method,
  public.mask_email(paypal_email) AS paypal_email,
  stripe_account_id, stripe_transfer_id,
  notes, processed_at, processed_by, created_at
FROM public.affiliate_payouts;

CREATE OR REPLACE VIEW public.seller_payouts_masked
WITH (security_invoker = on) AS
SELECT id, store_id, seller_id, amount, status,
  payout_method, auto_processed,
  public.mask_email(paypal_email) AS paypal_email,
  stripe_transfer_id, stripe_funding_payout_id,
  wise_transfer_id, wise_quote_id,
  funding_status, funding_requested_at,
  failure_reason, notes,
  processed_at, processed_by, completed_at, created_at
FROM public.seller_payouts;
