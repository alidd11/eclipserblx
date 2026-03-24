
-- Add missing columns to seller_payouts table
ALTER TABLE public.seller_payouts
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe';

ALTER TABLE public.seller_payouts
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Backfill existing records from store_payment_details
UPDATE public.seller_payouts sp
SET 
  payout_method = COALESCE(spd.payout_method, 'stripe'),
  paypal_email = CASE WHEN spd.payout_method = 'paypal' THEN spd.paypal_email ELSE NULL END
FROM public.store_payment_details spd
WHERE spd.store_id = sp.store_id
  AND sp.payout_method = 'stripe';
