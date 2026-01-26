-- Add ping pricing to advertisement_tiers table
ALTER TABLE public.advertisement_tiers
ADD COLUMN IF NOT EXISTS here_ping_price_gbp numeric DEFAULT 0.99,
ADD COLUMN IF NOT EXISTS everyone_ping_price_gbp numeric DEFAULT 1.99;

-- Add ping selection to discord_advertisements table  
ALTER TABLE public.discord_advertisements
ADD COLUMN IF NOT EXISTS ping_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ping_price_paid numeric DEFAULT 0;

-- Update existing tiers with ping prices
UPDATE public.advertisement_tiers SET 
  here_ping_price_gbp = 0.99,
  everyone_ping_price_gbp = 1.99
WHERE here_ping_price_gbp IS NULL;