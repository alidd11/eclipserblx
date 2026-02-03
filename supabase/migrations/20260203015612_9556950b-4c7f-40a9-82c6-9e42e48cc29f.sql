-- Add Robux advertisement gamepass settings
INSERT INTO public.settings (key, value)
VALUES 
  ('robux_ad_gamepass_id', '""'),
  ('robux_ad_gamepass_name', '"Single Advertisement"'),
  ('robux_ad_gamepass_robux_price', '100')
ON CONFLICT (key) DO NOTHING;

-- Add robux payment tracking to discord_advertisements
ALTER TABLE public.discord_advertisements 
ADD COLUMN IF NOT EXISTS robux_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

-- Create index for robux transaction lookup
CREATE INDEX IF NOT EXISTS idx_discord_ads_robux_transaction 
ON public.discord_advertisements(robux_transaction_id) 
WHERE robux_transaction_id IS NOT NULL;