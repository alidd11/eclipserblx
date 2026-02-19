
-- Add partnership_pings_balance column to advertisement_subscriptions
ALTER TABLE public.advertisement_subscriptions 
ADD COLUMN IF NOT EXISTS partnership_pings_balance integer NOT NULL DEFAULT 0;

-- Set initial balances based on tier for existing active subscriptions
UPDATE public.advertisement_subscriptions
SET partnership_pings_balance = CASE
  WHEN tier = 'basic' THEN 2
  WHEN tier = 'pro' THEN 4
  WHEN tier = 'premium' THEN 10
  ELSE 0
END
WHERE status = 'active';
