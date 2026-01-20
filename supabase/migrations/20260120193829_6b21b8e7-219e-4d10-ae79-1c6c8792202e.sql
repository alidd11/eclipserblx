-- Add compliance fields to store_applications
ALTER TABLE public.store_applications
ADD COLUMN IF NOT EXISTS age_confirmed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Add payout method fields to stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS paypal_email text,
ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'stripe';

-- Add constraint to ensure valid payout method
ALTER TABLE public.stores
ADD CONSTRAINT valid_payout_method CHECK (payout_method IN ('stripe', 'paypal', 'bank'));

-- Add constraint to ensure PayPal email is set when payout method is paypal
ALTER TABLE public.stores
ADD CONSTRAINT paypal_email_required CHECK (
  payout_method != 'paypal' OR paypal_email IS NOT NULL
);