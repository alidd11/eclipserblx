
-- Masked view for seller_payouts (correct columns)
CREATE OR REPLACE VIEW public.seller_payouts_masked AS
SELECT
  id, store_id, seller_id, amount, status,
  payout_method, auto_processed,
  public.mask_email(paypal_email) AS paypal_email,
  stripe_transfer_id, stripe_funding_payout_id,
  wise_transfer_id, wise_quote_id,
  funding_status, funding_requested_at,
  failure_reason, notes,
  processed_at, processed_by, completed_at,
  created_at
FROM public.seller_payouts;
