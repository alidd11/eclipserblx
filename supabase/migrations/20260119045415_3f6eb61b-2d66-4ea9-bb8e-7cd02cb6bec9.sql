-- Add stripe_account_id to profiles for Stripe Connect
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add stripe_account_id to affiliate_payouts to track which account was paid
ALTER TABLE public.affiliate_payouts
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
DROP COLUMN IF EXISTS paypal_email,
DROP COLUMN IF EXISTS paypal_payout_id;

-- Update affiliate_commissions to track the order amount in pence
ALTER TABLE public.affiliate_commissions
ALTER COLUMN order_total TYPE INTEGER USING (order_total * 100)::INTEGER,
ALTER COLUMN commission_amount TYPE INTEGER USING (commission_amount * 100)::INTEGER;