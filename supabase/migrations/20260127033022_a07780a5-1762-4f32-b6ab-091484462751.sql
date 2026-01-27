-- Add Roblox integration fields to stores table for seller-specific settings
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS roblox_group_id TEXT,
ADD COLUMN IF NOT EXISTS roblox_group_discount_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS roblox_group_discount_percent INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS roblox_group_min_rank INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS roblox_premium_discount_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS roblox_premium_discount_percent INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS roblox_gamepass_id TEXT,
ADD COLUMN IF NOT EXISTS roblox_gamepass_discount_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS roblox_gamepass_discount_percent INTEGER DEFAULT 15;

-- Add index for group lookups
CREATE INDEX IF NOT EXISTS idx_stores_roblox_group_id ON public.stores(roblox_group_id) WHERE roblox_group_id IS NOT NULL;