-- Add ping balance columns to advertisement_subscriptions
ALTER TABLE public.advertisement_subscriptions
ADD COLUMN IF NOT EXISTS here_pings_balance integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS everyone_pings_balance integer DEFAULT 0;

-- Reduce ping prices in advertisement_tiers (these become bulk purchase prices)
UPDATE public.advertisement_tiers SET here_ping_price_gbp = 0.79 WHERE here_ping_price_gbp = 0.99;
UPDATE public.advertisement_tiers SET everyone_ping_price_gbp = 1.49 WHERE everyone_ping_price_gbp = 1.99;