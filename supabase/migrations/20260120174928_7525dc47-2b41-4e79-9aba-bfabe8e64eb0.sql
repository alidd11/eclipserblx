-- Add Discord integration columns for sellers
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS review_discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS discord_bot_token TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_id TEXT,
ADD COLUMN IF NOT EXISTS discord_role_id TEXT;