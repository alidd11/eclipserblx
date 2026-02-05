-- Add discord_guild_id to stores for multi-server bot support
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS discord_guild_id TEXT;

-- Create index for faster lookups by guild ID
CREATE INDEX IF NOT EXISTS idx_stores_discord_guild_id ON public.stores(discord_guild_id) WHERE discord_guild_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.stores.discord_guild_id IS 'Discord server (guild) ID where the store bot commands will work';