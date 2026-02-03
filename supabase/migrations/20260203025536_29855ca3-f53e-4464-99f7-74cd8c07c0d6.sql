-- Add payment_method and roblox_subscription_id to advertisement_subscriptions
ALTER TABLE public.advertisement_subscriptions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS roblox_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS roblox_user_id TEXT;

-- Create index for roblox subscription lookups
CREATE INDEX IF NOT EXISTS idx_ad_subscriptions_roblox_subscription_id 
ON public.advertisement_subscriptions(roblox_subscription_id) 
WHERE roblox_subscription_id IS NOT NULL;

-- Create index for roblox user lookups
CREATE INDEX IF NOT EXISTS idx_ad_subscriptions_roblox_user_id 
ON public.advertisement_subscriptions(roblox_user_id) 
WHERE roblox_user_id IS NOT NULL;