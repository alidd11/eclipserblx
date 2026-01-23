-- Add preferred_payout_method column to affiliate_applications
ALTER TABLE public.affiliate_applications 
ADD COLUMN IF NOT EXISTS preferred_payout_method text DEFAULT 'paypal';

-- Add payout_method column to affiliate_payouts to track which method was used
ALTER TABLE public.affiliate_payouts 
ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'paypal';

-- Add comment for clarity
COMMENT ON COLUMN public.affiliate_applications.preferred_payout_method IS 'Affiliate preferred payout method: stripe or paypal';
COMMENT ON COLUMN public.affiliate_payouts.payout_method IS 'The payout method used: stripe or paypal';